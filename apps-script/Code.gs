/**
 * @OnlyCurrentDoc  O script só pode mexer nesta folha, em mais nenhuma do teu Drive.
 */

/**
 * Tesouraria dos Exploradores 1308 — "cérebro" do site.
 *
 * Cola este ficheiro em Extensões → Apps Script, na folha da tesouraria.
 * Em Definições do projeto → Propriedades do script, cria:
 *   GEMINI_API_KEY  a chave grátis do Google AI Studio
 *   PIN             o código do tesoureiro (ex.: 6 algarismos)
 *   GEMINI_MODEL    (opcional) o modelo preferido, ex.: gemini-3.8-flash; sem isto, o script escolhe sozinho
 *
 * O que faz:
 *   GET               devolve as contas (sem links de talões) para o site mostrar
 *   POST pergunta     responde a uma pergunta sobre as contas, com o Gemini
 *   POST pin          confirma o PIN do tesoureiro
 *   POST talao        lê a foto de um talão com o Gemini e guarda-a no Drive (PIN)
 *   POST adicionar    acrescenta um movimento à aba Movimentos (PIN)
 */

const ABAS = { mov: "Movimentos", def: "Definições", orc: "Orçamento", cat: "Categorias" };
const PASTA_TALOES = "Talões — Tesouraria Exploradores";
const LIMITE_PERGUNTAS_HORA = 40;
const LIMITE_PERGUNTAS_DIA = 250;

/* ---------------- entrada ---------------- */

function doGet() {
  return json_({ ok: true, ...lerContas_(false) });
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) { return json_({ ok: false, erro: "Pedido inválido." }); }
  try {
    switch (body.acao) {
      case "pergunta": return json_(pergunta_(String(body.pergunta || "").slice(0, 500)));
      case "pin": return json_({ ok: pinOk_(body.pin) });
      case "talao": exigirPin_(body.pin); return json_(lerTalao_(body.imagem, body.mime));
      case "adicionar": exigirPin_(body.pin); return json_(adicionar_(body.movimento || {}));
      default: return json_({ ok: false, erro: "Ação desconhecida." });
    }
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  }
}

/* ---------------- dados ---------------- */

function lerContas_(incluirLinks) {
  const ss = SpreadsheetApp.getActive();
  const tz = ss.getSpreadsheetTimeZone();
  const tab = nome => {
    const sh = ss.getSheetByName(nome);
    if (!sh || sh.getLastRow() < 1) return [];
    const vals = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
    return vals
      .map(r => r.map(v => v instanceof Date ? Utilities.formatDate(v, tz, "yyyy-MM-dd") : v))
      .filter((r, i) => i === 0 || r.some(v => v !== "" && v !== null));
  };
  const mov = tab(ABAS.mov);
  if (!incluirLinks && mov.length) {
    const iTal = mov[0].findIndex(h => /tal/i.test(String(h)));
    if (iTal > -1) mov.forEach((r, i) => { if (i > 0 && /^https?:\/\//.test(String(r[iTal]))) r[iTal] = "Talão digitalizado"; });
  }
  return { movimentos: mov, definicoes: tab(ABAS.def), orcamento: tab(ABAS.orc), lidoEm: new Date().toISOString() };
}

function adicionar_(m) {
  const data = String(m.data || "");
  const valor = Number(m.valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("Data inválida.");
  if (!(valor > 0) || valor > 100000) throw new Error("Valor inválido.");
  const tipo = m.tipo === "Entrada" ? "Entrada" : "Saída";
  const sh = SpreadsheetApp.getActive().getSheetByName(ABAS.mov);
  if (!sh) throw new Error('Não encontrei a aba "Movimentos".');
  const [y, mo, d] = data.split("-").map(Number);
  const corta = (s, n) => String(s || "").replace(/^[=+\-@]/, "'$&").slice(0, n);
  sh.appendRow([new Date(y, mo - 1, d), tipo, corta(m.categoria, 60), corta(m.descricao, 140), corta(m.atividade, 80), valor, corta(m.talao, 300)]);
  const r = sh.getLastRow();
  sh.getRange(r, 1).setNumberFormat("dd/mm/yyyy");
  sh.getRange(r, 6).setNumberFormat("#,##0.00");
  return { ok: true };
}

/* ---------------- Gemini ---------------- */

/**
 * Lista de modelos a tentar, do melhor para o pior. Se GEMINI_MODEL estiver definido, é o primeiro
 * a tentar (para as perguntas e para os talões); os outros ficam de reserva se ele estiver ocupado.
 * Senão pergunta à Google que modelos existem para esta chave (a Google muda os nomes com
 * frequência) e ordena os "Flash", pondo primeiro o último que funcionou.
 * rapido = true prefere os "Flash-Lite" (respondem mais depressa; bons para perguntas).
 * rapido = false prefere o Flash completo (mais preciso; melhor para ler talões).
 */
function candidatos_(key, rapido) {
  const props = PropertiesService.getScriptProperties();
  const fixo = String(props.getProperty("GEMINI_MODEL") || "").trim().replace(/^models\//, "");
  const cache = CacheService.getScriptCache();
  let nomes = JSON.parse(cache.get("gemini_modelos_v2") || "null");
  if (!nomes) {
    const res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key }, muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) throw new Error("Não consegui ver os modelos do Gemini (" + res.getResponseCode() + "). Confirma a chave GEMINI_API_KEY.");
    nomes = (JSON.parse(res.getContentText()).models || [])
      .filter(m => (m.supportedGenerationMethods || []).indexOf("generateContent") > -1)
      .map(m => String(m.name).replace(/^models\//, ""))
      .filter(n => /flash/.test(n) && !/(image|tts|audio|live|embedding|thinking|exp|8b)/.test(n));
    if (!nomes.length) throw new Error("Não encontrei nenhum modelo Gemini Flash disponível para esta chave.");
    cache.put("gemini_modelos_v2", JSON.stringify(nomes), 6 * 3600);
  }
  const pontos = n => {
    let p = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0") * 10;
    if (/lite/.test(n)) p += rapido ? 15 : -3;
    if (/preview/.test(n)) p -= 2;
    if (/latest/.test(n)) p += 1;
    return p;
  };
  let lista = nomes.slice().sort((a, b) => pontos(b) - pontos(a)).slice(0, 6);
  const ultimo = props.getProperty(rapido ? "GEMINI_MODEL_RAPIDO" : "GEMINI_MODEL_AUTO");
  if (ultimo && lista.indexOf(ultimo) > -1) lista = [ultimo].concat(lista.filter(n => n !== ultimo));
  if (fixo) lista = [fixo].concat(lista.filter(n => n !== fixo));
  return lista;
}

function gemini_(parts, comoJson, rapido) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("GEMINI_API_KEY");
  if (!key) throw new Error("Falta a chave do Gemini nas propriedades do script.");
  const chamar = modelo => UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": key },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: comoJson ? { responseMimeType: "application/json", temperature: 0.1 } : { temperature: 0.4 },
    }),
  });
  // Tenta até 3 modelos. Ocupado (503/500) ou limite (429) num modelo → passa ao seguinte.
  let res, code = 0, tentados = [];
  for (const modelo of candidatos_(key, !!rapido).slice(0, 3)) {
    tentados.push(modelo);
    res = chamar(modelo);
    code = res.getResponseCode();
    if (code === 503 || code === 500) { Utilities.sleep(1000); res = chamar(modelo); code = res.getResponseCode(); }
    if (code === 200) { props.setProperty(rapido ? "GEMINI_MODEL_RAPIDO" : "GEMINI_MODEL_AUTO", modelo); break; }
    if (code === 404) CacheService.getScriptCache().remove("gemini_modelos_v2");
    if ([404, 429, 500, 503].indexOf(code) === -1) break;
  }
  if (code === 429) throw new Error("O Gemini atingiu o limite gratuito. Tenta daqui a uns minutos.");
  if (code === 503 || code === 500) throw new Error("O Gemini está sobrecarregado neste momento. Tenta daqui a um minuto.");
  if (code === 404) throw new Error("Modelo Gemini não encontrado (" + tentados.join(", ") + "). Confirma o nome em GEMINI_MODEL ou apaga essa propriedade.");
  if (code !== 200) throw new Error("O Gemini não respondeu (" + code + ", modelos tentados: " + tentados.join(", ") + ").");
  const out = JSON.parse(res.getContentText());
  const txt = (((out.candidates || [])[0] || {}).content || {}).parts;
  return (txt || []).map(p => p.text || "").join("").trim();
}

function pergunta_(q) {
  if (!q.trim()) return { ok: false, erro: "Escreve uma pergunta." };
  limitarPerguntas_();
  const c = lerContas_(false);
  const csv = rows => rows.map(r => r.join(";")).join("\n");
  const hoje = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  const prompt = `És o assistente da tesouraria da secção de Exploradores (escuteiros dos 10 aos 14 anos) do Agrupamento 1308 de Genebra, Suíça. Moeda: CHF. Hoje: ${hoje}.
O ano escutista vai de 1 de setembro a 31 de agosto.
O grande projeto da secção é o Caminho de Santiago 2027: 8 a 12 de setembro de 2027, 19 exploradores + 5 dirigentes (24 pessoas),
Caminho Francês de Salceda a Santiago (~11 km + ~20 km a pé). Meta de angariação: CHF 6'000 (CHF 250 por pessoa).
Orçamento previsto (ainda sem cotações): voos CHF 3'360, alimentação CHF 960, dormidas CHF 768, transporte local CHF 480, margem CHF 432.
O dinheiro angariado para Santiago são as entradas com "Santiago" na atividade ou na descrição.

DEFINIÇÕES (saldo inicial, meta, etc.):
${csv(c.definicoes)}

ORÇAMENTO:
${csv(c.orcamento)}

MOVIMENTOS:
${csv(c.movimentos)}

Regras: responde em português de Portugal, curto (no máximo 5 frases), claro e simpático: quem pergunta são chefes, escuteiros e pais.
Usa só estes dados e faz as contas com cuidado. Se a resposta não estiver nos dados, diz isso. Escreve valores como CHF 1'234.50. Não uses markdown.
Se a pergunta não tiver nada a ver com as finanças da secção, responde com simpatia que só sabes falar das contas.

Pergunta: ${q}`;
  return { ok: true, resposta: gemini_([{ text: prompt }], false, true) };
}

function lerTalao_(b64, mime) {
  if (!b64 || String(b64).length > 8 * 1024 * 1024) throw new Error("Imagem em falta ou demasiado grande.");
  mime = /^image\/(jpeg|png|webp)$/.test(mime) ? mime : "image/jpeg";
  const cats = SpreadsheetApp.getActive().getSheetByName(ABAS.cat);
  const lista = cats ? cats.getRange(2, 1, Math.max(1, cats.getLastRow() - 1), 2).getValues().filter(r => r[1]).map(r => `${r[0]}: ${r[1]}`).join("\n") : "";
  const hoje = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  const prompt = `Esta é a foto de um talão ou fatura de uma compra (ou receita) de uma secção de escuteiros em Genebra, Suíça.
Responde só com JSON neste formato:
{"data":"AAAA-MM-DD","tipo":"Saída","categoria":"<nome exato da lista>","descricao":"descrição curta em português, ex.: Compras Migros para o raid","valor":12.5,"loja":"nome da loja"}
- valor = TOTAL pago em CHF (número, ponto decimal). Se estiver noutra moeda, não convertas: põe o valor e indica a moeda na descrição.
- Se a data não for legível, usa ${hoje}.
- categoria: escolhe a mais provável desta lista (Tipo: Categoria):
${lista}`;
  const txt = gemini_([{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }], true, false);
  let dados;
  try { dados = JSON.parse(txt.replace(/^```(json)?|```$/g, "")); } catch (e) { throw new Error("Não consegui ler o talão. Tenta uma foto mais nítida."); }
  let link = "";
  try {
    const pastas = DriveApp.getFoldersByName(PASTA_TALOES);
    const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA_TALOES);
    const nome = `${dados.data || hoje} ${String(dados.loja || "talao").slice(0, 40)} ${dados.valor || ""}.jpg`;
    link = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, nome)).getUrl();
  } catch (e) { /* guardar no Drive é um extra; se falhar, segue sem link */ }
  return { ok: true, talao: dados, link };
}

/* ---------------- segurança ---------------- */

function pinOk_(pin) {
  const cache = CacheService.getScriptCache();
  const falhas = Number(cache.get("pin_falhas") || 0);
  if (falhas >= 8) throw new Error("Demasiadas tentativas erradas. Espera 30 minutos.");
  const certo = PropertiesService.getScriptProperties().getProperty("PIN");
  const ok = !!certo && String(pin || "") === certo;
  if (!ok) cache.put("pin_falhas", String(falhas + 1), 1800);
  return ok;
}
function exigirPin_(pin) { if (!pinOk_(pin)) throw new Error("PIN errado."); }

function limitarPerguntas_() {
  const cache = CacheService.getScriptCache();
  const h = Number(cache.get("perg_hora") || 0);
  if (h >= LIMITE_PERGUNTAS_HORA) throw new Error("Muitas perguntas nesta hora. Tenta mais tarde.");
  cache.put("perg_hora", String(h + 1), 3600);
  const props = PropertiesService.getScriptProperties();
  const k = "perg_" + Utilities.formatDate(new Date(), "UTC", "yyyyMMdd");
  const d = Number(props.getProperty(k) || 0);
  if (d >= LIMITE_PERGUNTAS_DIA) throw new Error("Chegámos ao limite de perguntas de hoje. Volta amanhã.");
  if (!d) Object.keys(props.getProperties()).forEach(x => { if (x.startsWith("perg_") && x !== k) props.deleteProperty(x); });
  props.setProperty(k, String(d + 1));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Corre esta função uma vez no editor para autorizar o script e testar a chave. */
function testar() {
  Logger.log(JSON.stringify(lerContas_(false)).slice(0, 300));
  const p = PropertiesService.getScriptProperties();
  let t = Date.now();
  Logger.log("Perguntas (rápido): " + gemini_([{ text: "Responde só: olá escuteiros!" }], false, true) +
    " — " + p.getProperty("GEMINI_MODEL_RAPIDO") + ", " + ((Date.now() - t) / 1000).toFixed(1) + " s");
  t = Date.now();
  Logger.log("Talões (preciso): " + gemini_([{ text: "Responde só: olá escuteiros!" }], false, false) +
    " — " + p.getProperty("GEMINI_MODEL_AUTO") + ", " + ((Date.now() - t) / 1000).toFixed(1) + " s");
}
