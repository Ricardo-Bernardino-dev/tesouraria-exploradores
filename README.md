# Tesouraria dos Exploradores · Agrupamento 1308 Genebra

Site com as contas da 2.ª Secção. O site está no **GitHub Pages** e os números vêm de uma **folha do Google Sheets** editada pelo tesoureiro. Tudo grátis.

```
Tesoureiro edita a folha do Google  →  o site lê a folha  →  a secção abre o link
```

Para atualizar as contas, mexe só na folha. Não precisas de tocar no site.

---

## Configuração (uma vez só, cerca de 20 minutos)

### 1. Criar a folha do Google
1. Vai a [drive.google.com](https://drive.google.com) e entra com a tua conta Google.
2. Carrega em **Novo → Carregamento de ficheiros** e escolhe `Folha-Tesouraria-Exploradores.xlsx`.
3. Abre o ficheiro e vai a **Ficheiro → Guardar como Google Sheets**. A partir daqui trabalhas sempre nesta cópia.
4. Em **Ficheiro → Definições**, escolhe **Região: Portugal** ou **Suíça**, para as datas ficarem no formato dia/mês/ano.
5. Em **Partilhar → Acesso geral**, escolhe **"Qualquer pessoa com o link"** com a função **Leitor**.
   Sem este passo o site não consegue ler as contas.
6. Copia o **ID da folha**, que é o bocado do link entre `/d/` e `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xYz`**`/edit`

### 2. Ligar o site à folha
Abre o `index.html` num editor de texto e procura esta linha, perto do fim:
```js
const SHEET_ID = "";
```
Cola o ID entre as aspas:
```js
const SHEET_ID = "1AbC...xYz";
```

### 3. Pôr o site online no GitHub Pages
1. Cria uma conta grátis em [github.com](https://github.com).
2. Carrega no **+** (canto superior direito) e depois em **New repository**.
   - Nome: por exemplo `tesouraria-exploradores`
   - Escolhe **Public**. O GitHub Pages grátis só funciona com repositórios públicos.
   - Carrega em **Create repository**.
3. Na página do repositório, carrega em **uploading an existing file** e arrasta o `index.html`. Carrega em **Commit changes**.
4. Vai a **Settings → Pages**. Em *Branch*, escolhe **main** e **/(root)** e carrega em **Save**.
5. Espera 1 a 2 minutos. O site fica em:
   **`https://<o-teu-utilizador>.github.io/tesouraria-exploradores/`**

Este é o link que mandas à secção.

> Atenção: o repositório é público, por isso qualquer pessoa vê o código e o ID da folha. Como a folha só tem as contas da secção, que já vão aparecer no site, não há problema. **Nunca escrevas na folha nomes completos, IBANs nem dados pessoais.**

### 4. (Opcional) Formulário de reembolso
1. Em [forms.google.com](https://forms.google.com), cria um formulário "Pedido de reembolso" com estas perguntas:
   - **Nome** (resposta curta)
   - **O que compraste** (resposta curta)
   - **Valor em CHF** (resposta curta)
   - **Data da compra** (data)
   - **Foto do talão** (carregamento de ficheiro; quem responde precisa de conta Google)
   - **Atividade** (resposta curta, opcional)
2. Em **Respostas**, liga o formulário a uma folha **nova e separada**, para os nomes não ficarem na folha pública.
3. Carrega em **Enviar → link (🔗)**, copia o link e cola-o na aba **Definições** da folha, na coluna *Link do formulário de reembolso*.
   O botão "Pedir reembolso" aparece sozinho no site.

---

## Dia a dia

### Abas da folha
| Aba | O que pôr lá |
|---|---|
| **Movimentos** | Uma linha por entrada ou saída de dinheiro. *Tipo* e *Categoria* escolhem-se numa lista. |
| **Definições** | Só a linha 2: saldo inicial (o dinheiro que havia na *data do saldo inicial*), nº de exploradores, meta de poupança e link do formulário. |
| **Orçamento** | Uma linha por categoria e por ano, com o ano escrito como `2026/27`. |
| **Categorias** | A lista das categorias. Não mudes os nomes, porque o site reconhece-os por eles. |

Apaga as duas linhas **EXEMPLO** da aba Movimentos antes de começares.

### Atualizar
- Escreves na folha e as alterações aparecem no site da próxima vez que alguém o abrir, ou quando carregar em **Atualizar**.
- No fim de cada ano escutista (31 de agosto) não precisas de fazer nada. O site separa os anos sozinho.

### Ler talões com o Claude
Manda a foto do talão ao Claude com este pedido:
> "Lê este talão e dá-me uma linha para a minha folha da tesouraria: Data | Tipo | Categoria | Descrição | Atividade | Valor | Talão."

Depois colas a resposta na aba Movimentos.

---

## Problemas comuns
| O site diz… | Solução |
|---|---|
| "Dados de exemplo" | O `SHEET_ID` no `index.html` está vazio. Repete o passo 2 e volta a carregar o ficheiro no GitHub. |
| "Não consegui ler as contas" | A folha não está partilhada como "Qualquer pessoa com o link", ou a aba não se chama exatamente `Movimentos`. |
| Datas trocadas (mês com dia) | Muda a região da folha para Portugal ou Suíça (passo 1.4). |
| Um movimento não aparece | Confirma que tem data e valor preenchidos. |
| Categoria aparece como "Outras" | O nome da categoria está escrito de forma diferente da aba Categorias. Escolhe-o na lista. |
