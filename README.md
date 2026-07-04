# Controle Financeiro — Google Sheets + AppScript

Aplicação web de controle financeiro pessoal construída inteiramente sobre o **Google Sheets** e o **Google Apps Script**, sem necessidade de banco de dados externo, servidor ou custo de hospedagem. A planilha do usuário é o banco de dados; o Apps Script é o back-end; e uma interface HTML/CSS/JS moderna funciona como front-end, rodando tanto embutida no Google Sheets quanto publicada como Web App independente.

---

## 📌 Visão geral

O projeto permite registrar, visualizar e gerenciar três tipos de movimentação financeira:

- **Receitas** — entradas de dinheiro (salário, freelance, cashback etc.)
- **Despesas** — saídas de dinheiro (contas, compras, assinaturas etc.)
- **Investimentos** — aportes (entrada) e resgates/decréscimos (saída) em investimentos

Todos os lançamentos ficam armazenados na aba **"Lançamentos"** da planilha, e as categorias de cada tipo ficam centralizadas na aba **"Categorias"**, ambas criadas e formatadas automaticamente pelo próprio script na primeira execução.

### Principais funcionalidades

- 📊 **Dashboard interativo** com KPIs (Saldo, Receitas, Despesas, Investimentos, Despesas futuras)
- 🏆 **Ranking por tipo** com participação percentual de cada categoria
- 📝 **Lançamento rápido** de receitas, despesas e investimentos, com suporte a **parcelamento** (repetição em N meses)
- ✏️ **Edição e exclusão** de lançamentos diretamente pela interface, com atualização otimista (UI responde na hora, sincroniza em segundo plano)
- 🏷️ **Gerenciamento de categorias** (criar, renomear, excluir) por tipo de lançamento
- 🔍 **Filtros avançados**: por tipo, categoria, mês, período personalizado e busca livre
- 📱 **Layout responsivo**, com visual e navegação adaptados para mobile
- 🌓 **Interface dark mode** nativa
- 🔄 **Migração automática** de categorias legadas caso a aba "Categorias" ainda não exista
- 🛡️ **Validações defensivas** no back-end para impedir gravação de lançamentos com tipo inválido/ausente

---

## 🧱 Tecnologias aplicadas

| Camada              | Tecnologia                                                                 |
|---------------------|------------------------------------------------------------------------------|
| Back-end            | [Google Apps Script](https://developers.google.com/apps-script) (JavaScript rodando sobre a API do Google Sheets) |
| Banco de dados       | Google Sheets (abas `Lançamentos` e `Categorias`)                            |
| Front-end            | HTML5, CSS3 e JavaScript puro (Vanilla JS, sem frameworks ou build step)     |
| Comunicação front↔back | `google.script.run` (chamadas assíncronas do HTML para as funções do Apps Script) |
| Ícones               | [Boxicons](https://boxicons.com/)                                            |
| Hospedagem/Deploy    | Google Apps Script Web App (`doGet`) — gratuito, sem servidor próprio        |

Não há dependências de `npm`, build tools ou frameworks de front-end o projeto roda 100% dentro do ecossistema Google, o que simplifica a manutenção e elimina custos de infraestrutura.

---

## 🗂️ Estrutura do projeto

```
📁 controle-financeiro/
├── Script.gs          → Back-end: rotas, leitura/gravação de dados, formatação da planilha
├── Dashboard.html      → Front-end: dashboard, formulário de lançamento e gestão de categorias
└── README.md           → Este arquivo
```

> 💡 O `Script.gs` está preparado para servir páginas adicionais (`Lancamento.html`, `Categorias.html`) via parâmetro `?page=`, mas na versão atual todo o front-end está unificado em `Dashboard.html`, com painéis internos (side panels) para lançamento e categorias.

### O que cada arquivo faz

**`Script.gs`**
- `onOpen()` — cria o menu "💲 Controle Financeiro" no Google Sheets
- `inicializarPlanilha()` — garante a existência e formatação das abas `Lançamentos` e `Categorias`
- `doGet(e)` — serve a aplicação como Web App
- `getDados()` — lê e normaliza todos os lançamentos da planilha
- `getCategorias()` — lê as categorias cadastradas por tipo
- `salvarLancamento()` / `salvarLoteLancamentos()` — grava um ou vários lançamentos (parcelas) em lote
- `editarLancamento()` / `excluirLancamento()` — edita/remove um lançamento existente
- `salvarCategoriaGerenciada()` / `renomearCategoriaGerenciada()` / `excluirCategoriaGerenciada()` — CRUD de categorias

**`Dashboard.html`**
- Interface completa (HTML + CSS + JS embutido)
- KPIs, ranking por tipo, tabela de histórico com paginação, filtros, painel de lançamento e painel de categorias

---

## 🚀 Passo a passo: publicando no Google Sheets

### 1. Crie a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco.
2. Dê um nome à planilha (ex.: `Controle Financeiro`).

### 2. Abra o editor do Apps Script

1. Na planilha, vá em **Extensões → Apps Script**.
2. Isso abrirá o editor do Google Apps Script vinculado a essa planilha.

### 3. Adicione o `Script.gs`

1. No editor, você já verá um arquivo padrão chamado `Código.gs` (ou `Code.gs`).
2. Apague o conteúdo padrão e cole todo o conteúdo do arquivo **`Script.gs`** deste repositório.
3. Renomeie o arquivo para `Script` (o `.gs` é automático), se desejar manter o mesmo nome.

### 4. Adicione o `Dashboard.html`

1. No editor do Apps Script, clique no ícone **+** ao lado de "Arquivos" → **HTML**.
2. Nomeie o novo arquivo exatamente como **`Dashboard`** (sem extensão, o Apps Script adiciona `.html` automaticamente).
3. Apague o conteúdo padrão gerado e cole todo o conteúdo do arquivo **`Dashboard.html`** deste repositório.
4. Salve o projeto (ícone de disquete ou `Ctrl+S`).

### 5. Publique como Web App

1. No editor, clique em **Implantar → Nova implantação**.
2. Em "Tipo", selecione **App da Web**.
3. Configure:
   - **Executar como:** *Eu (seu e-mail)*
   - **Quem pode acessar:** escolha conforme sua necessidade (*Apenas eu*, para uso pessoal, ou *Qualquer pessoa com uma Conta Google*, para compartilhar com terceiros)
4. Clique em **Implantar**.
5. Na primeira execução, o Google solicitará permissões, clique em **Autorizar acesso**, escolha sua conta e confirme (pode aparecer um aviso de "app não verificado"; clique em **Avançado → Acessar [nome do projeto] (não seguro)**, pois é o seu próprio script).
6. Copie a **URL do app da Web** gerada. É por ela que você acessará o dashboard.

### 6. Primeira execução

1. Acesse a URL do Web App copiada no passo anterior.
2. Na primeira vez, o `doGet()` chama automaticamente a criação das abas **Lançamentos** e **Categorias** formatadas.
3. Alternativamente, volte à planilha e recarregue a página — o menu **💲 Controle Financeiro → 📊 Abrir Aplicação** também abre o dashboard em uma janela modal dentro do próprio Sheets.

### 7. Comece a lançar seus dados

1. Clique em **Novo Lançamento**.
2. Escolha o tipo (Receita, Despesa ou Investimento), preencha data, valor, categoria e observação.
3. Para investimentos, é possível alternar entre **aporte (entrada)** e **decréscimo (saída/resgate)** usando o botão de sinal (+/−).
4. Ative **"Repetir este lançamento"** para gerar parcelas automáticas em meses seguintes.

---

## 📐 Estrutura de dados esperada

### Aba `Lançamentos`

| Coluna | Campo        | Tipo                                  |
|--------|--------------|----------------------------------------|
| A      | Data         | Data                                   |
| B      | Tipo         | `RECEITA` \| `DESPESA` \| `INVESTIMENTO` |
| C      | Categoria    | Texto                                   |
| D      | Valor        | Número (negativo para decréscimo de investimento) |
| E      | Observação   | Texto (opcional)                        |

### Aba `Categorias`

| Coluna | Campo          |
|--------|----------------|
| A      | Receitas       |
| B      | Despesas       |
| C      | Investimentos  |

> ⚠️ Não recomendamos editar essas abas manualmente com valores fora do padrão (ex.: digitar "Saída" na coluna Tipo), sempre utilize a interface para lançar e editar registros, garantindo que o tipo seja gravado corretamente.

---

## 🔐 Permissões necessárias

O Apps Script solicitará acesso a:
- **Google Sheets** — para ler e gravar os lançamentos e categorias
- **Interface externa (Web App)** — para exibir o dashboard como aplicação independente

Nenhum dado é enviado a servidores de terceiros: tudo permanece dentro da sua conta Google.

---

## 🛠️ Atualizando o código após alterações

Sempre que você alterar `Script.gs` ou `Dashboard.html` diretamente no editor do Apps Script:

1. Salve os arquivos (`Ctrl+S`).
2. Vá em **Implantar → Gerenciar implantações**.
3. Clique no ícone de lápis (editar) na implantação ativa.
4. Em "Versão", selecione **Nova versão**.
5. Clique em **Implantar**.

> ⚠️ Simplesmente salvar o código **não** atualiza automaticamente uma implantação de Web App já publicada é necessário criar uma nova versão, como descrito acima, para que as mudanças entrem em vigor na URL pública.

---

## 🗺️ Roadmap / possíveis melhorias futuras

- [ ] Gráficos de evolução mensal (receita x despesa x investimento)
- [ ] Exportação de relatórios em PDF
- [ ] Metas de gastos por categoria
- [ ] Multiusuário com planilhas separadas por perfil
- [ ] Modo claro (light mode)

---

## 📄 Licença

Este projeto pode ser distribuído sob a licença [MIT](https://opensource.org/licenses/MIT) — sinta-se livre para adaptar, modificar e reutilizar o código conforme sua necessidade. Adicione um arquivo `LICENSE` ao repositório se desejar formalizar isso.

---

## 🤝 Contribuindo

Sugestões, correções e melhorias são bem-vindas! Para contribuir:

1. Faça um fork do repositório
2. Crie uma branch (`git checkout -b minha-melhoria`)
3. Commit suas alterações (`git commit -m 'Adiciona minha melhoria'`)
4. Envie um push (`git push origin minha-melhoria`)
5. Abra um Pull Request

---

**Feito com Google Apps Script.**
