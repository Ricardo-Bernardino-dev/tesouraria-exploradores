# Tesouraria dos Exploradores · Agrupamento 1308 Genebra

Site com as contas da 2.ª Secção, com uma inteligência artificial que lê talões e responde a perguntas. **Tudo grátis.**

```
 Folha do Google (privada) ─── Apps Script + Gemini ─── site no GitHub Pages ─── secção abre o link
        ▲                                                   │
        └──────── tesoureiro: foto do talão / novo movimento (com PIN)
```

| Peça | Para quê | Custo |
|---|---|---|
| **GitHub Pages** | Aloja o site (`index.html`) | Grátis |
| **Google Sheets** | Onde estão as contas | Grátis |
| **Apps Script** (`apps-script/Code.gs`) | Liga o site à folha, guarda a chave do Gemini e o PIN | Grátis |
| **Gemini API** (Google AI Studio) | Lê talões e responde a perguntas | Grátis, com limite diário |

A folha fica **privada**: o site só vê o que o Apps Script lhe envia, e os links das fotos dos talões nunca aparecem no site.

---

## Configuração (uma vez só, cerca de 30 minutos)

### 1. Folha do Google
1. Em [drive.google.com](https://drive.google.com), carrega em **Novo → Carregamento de ficheiros** e escolhe `Folha-Tesouraria-Exploradores.xlsx`.
2. Abre o ficheiro e vai a **Ficheiro → Guardar como Google Sheets**. A partir daqui trabalhas sempre nesta cópia.
3. Em **Ficheiro → Definições**, escolhe **Região: Suíça** ou **Portugal**.
4. Confirma que a partilha está em **Restrito**. Não é preciso partilhar a folha com ninguém.
5. Apaga as duas linhas **EXEMPLO** na aba Movimentos e preenche a aba **Definições** (linha 2) e a aba **Orçamento**.

### 2. Chave grátis do Gemini
1. Vai a [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e entra com a mesma conta Google.
2. Carrega em **Create API key** e copia a chave (começa por `AIza…`).
   **Não partilhes esta chave com ninguém nem a ponhas no site.** Vai só para o Apps Script.

### 3. Apps Script (o "cérebro")
1. Na folha, vai a **Extensões → Apps Script**.
2. Apaga o que lá estiver e cola o conteúdo de `apps-script/Code.gs`. Guarda com 💾.
3. Do lado esquerdo, abre **⚙️ Definições do projeto**. Em baixo, em **Propriedades do script**, acrescenta:
   | Propriedade | Valor |
   |---|---|
   | `GEMINI_API_KEY` | a chave do passo 2 |
   | `PIN` | um código só teu, por exemplo 6 algarismos |
4. Volta ao editor (**< >**), escolhe a função **`testar`** no menu de cima e carrega em **▶ Executar**.
   O Google pede autorização. Escolhe a tua conta, depois **Avançadas → Aceder a … (não seguro) → Permitir**. O aviso aparece porque o script é teu e não foi verificado pela Google; é normal.
   No registo deve aparecer "olá escuteiros!".
5. Carrega em **Implementar → Nova implementação**. Na roda dentada, escolhe **Aplicação Web** e preenche:
   - *Executar como:* **Eu**
   - *Quem tem acesso:* **Qualquer pessoa**
6. Carrega em **Implementar** e copia o **URL da aplicação Web** (termina em `/exec`).

### 4. Ligar o site
Manda o URL `/exec` ao Claude, que trata do resto e faz o push. Também podes fazê-lo tu: no `index.html`, procura `const API_URL = "";` e cola o URL entre as aspas.

### 5. GitHub Pages
No repositório, vai a **Settings → Pages**, escolhe *Branch* **main** e **/(root)** e carrega em **Save**.
O site fica em **https://ricardo-bernardino-dev.github.io/tesouraria-exploradores/**

---

## Dia a dia

### Pelo telemóvel (o mais rápido)
1. Abre o site e, lá em baixo, carrega em **Área do tesoureiro**. Mete o PIN; o telemóvel lembra-se dele.
2. Carrega em **📸 Tirar foto ao talão**. O Gemini preenche a data, o valor, a descrição e a categoria.
3. Confirma os dados e carrega em **Guardar na folha**.

A foto fica guardada na pasta **"Talões — Tesouraria Exploradores"** do teu Google Drive. O link aparece na coluna *Talão* da folha, mas não no site.

### Pela folha
Também podes escrever diretamente na folha. *Tipo* e *Categoria* escolhem-se numa lista; não mudes os nomes das categorias.

### Caminho de Santiago 2027
Tudo o que for angariado para a viagem deve ter **`Santiago 2027`** na coluna *Atividade*. É assim que o site calcula o fundo da viagem, o que falta angariar e quanto é preciso por mês. As despesas da viagem (voos, albergues…) também levam `Santiago 2027` e aparecem como "Já pago para a viagem".
O orçamento, os cenários e o itinerário estão no `index.html`, no bloco `SANTIAGO`. Quando houver cotações reais, pede ao Claude para os atualizar.

### Pergunta às contas
Qualquer pessoa pode perguntar no site, por exemplo "quanto já juntámos para Santiago?". Para não gastar o limite grátis, há um máximo de 40 perguntas por hora e 250 por dia.

### Mudar o código do Apps Script
Depois de alterares o `Code.gs`, vai a **Implementar → Gerir implementações → ✏️ → Versão: Nova versão → Implementar**. Assim o URL `/exec` não muda.

---

## Problemas comuns
| Sintoma | Solução |
|---|---|
| "Dados de exemplo" no site | O `API_URL` no `index.html` está vazio. |
| "Não consegui ler as contas" | No Apps Script, confirma que a implementação tem *Quem tem acesso: Qualquer pessoa*. |
| "Falta a chave do Gemini" | Falta a propriedade `GEMINI_API_KEY` (passo 3.3). |
| "O Gemini não respondeu (404)" | A Google mudou o nome do modelo. Acrescenta a propriedade `GEMINI_MODEL` com o nome atual (vê em [aistudio.google.com](https://aistudio.google.com)). |
| "O Gemini atingiu o limite gratuito" | Espera uns minutos. O limite renova-se sozinho. |
| "Demasiadas tentativas erradas" | Erraste o PIN 8 vezes. Espera 30 minutos. |
| Categoria aparece como "Outras" | O nome não coincide com a aba Categorias. Escolhe-o da lista. |

**Privacidade:** no plano grátis, a Google pode usar o que enviamos ao Gemini para melhorar os seus modelos. Não ponhas nomes completos, IBANs nem dados pessoais nos talões ou nas perguntas.
