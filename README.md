# Controle de Atividades | Elétrica Bahiana

Cronômetro de atividades da Elétrica Bahiana, dividido por áreas (Designs, Marketing e Gerência).

Endereço: https://marketing-eletrica-bahiana.github.io/Controle_Atividades/

Regras do projeto, dados e identidade visual: [CLAUDE.md](CLAUDE.md).

## Rodar no computador

Precisa do Node 24 e do Git.

```bash
npm install
npm run dev
```

Depois abra http://localhost:5173/Controle_Atividades/ no navegador. A demonstração sem login, com dados de mentira,
fica em `.claude/demo` (fora do GitHub; vai no pacote .zip entre computadores):

```bash
npm run dev -- --config .claude/demo/vite.config.js --port 5199
```

## Publicação

Cada envio na branch `main` publica o site sozinho pelo GitHub Actions (aba **Actions** do
repositório). Na primeira vez, em **Settings > Pages**, a opção **Source** precisa estar em
**GitHub Actions**.

## Editar em mais de um computador

Desde 26/11/2026 o projeto é editado em mais de um computador. Para nada se perder:

1. **Antes de começar**, trazer o que foi feito no outro computador (`git pull`) e ler o registro abaixo, das
   alterações mais recentes para as mais antigas.
2. **Depois de cada alteração**, escrever uma entrada no topo do registro, no mesmo envio (commit) da alteração.
3. Mudanças feitas direto no Firebase (dados, tipos, regras de segurança) também entram no registro, mesmo sem
   mudança no código.

## Registro de alterações

As mais recentes primeiro. Cada entrada diz o que mudou em palavras simples, os arquivos principais e o envio
(commit) correspondente. Os detalhes de cada regra estão no [CLAUDE.md](CLAUDE.md).

### 26/11/2026 · Registro de alterações e uso em mais de um computador
- Este registro no README e a regra no CLAUDE.md: ler antes de começar e anotar depois de cada alteração.
- Pacote `Controle_Atividades_outro_PC.zip` para levar o projeto a outro computador (sem `node_modules` e `dist`).
- Arquivos: `README.md`, `CLAUDE.md`.

### 25/11/2026 · Público, Solicitante, Uso de IA e Template obrigatórios
- Nenhuma demanda começa sem os quatro: Meu Cronômetro, "Iniciar o cronômetro" do cartão e lançamento manual de
  demanda nova. O campo faltando fica em vermelho.
- A janela "Antes de concluir" pede o que faltar (agora também o Público) e não conclui sem os quatro. Vale também
  ao concluir pelo cartão que vai para Entregues.
- Arquivos: `src/telas/cronometro/CamposDaDemanda.jsx` (`errosDaClassificacao`), `JanelasDoCronometro.jsx`,
  `FormDemanda.jsx`, `src/telas/quadro/useAcoesDoCartao.jsx`, `src/componentes/Campos.jsx`.
- Envio: `3827de5`.

### 25/11/2026 · Imagens no cartão do Quadro e na demanda
- Seção Imagens no cartão (também pelo Calendário) e nos detalhes da demanda: botão, arrastar ou colar com Ctrl+V.
- A imagem é reduzida no navegador (lado maior 1600 px, JPEG) e guardada no Firestore, no plano gratuito. A lista
  mostra miniaturas; a imagem inteira só é lida ao abrir. Visualizador com setas, Baixar e Excluir.
- Excluir cartão ou demanda apaga as imagens; juntar demandas passa as imagens para a que fica.
- Firebase: regras das coleções `imagens` e `imagensConteudo` publicadas no console antes do envio.
- Arquivos: `src/componentes/Imagens.jsx`, `src/dados/imagens.js`, `src/lib/imagens.js`, `src/lib/reduzirImagem.js`,
  `firestore.rules`.
- Envio: `6bc3e6b`.

### 25/11/2026 · Várias demandas rodando ao mesmo tempo
- Ao iniciar com outra rodando, a pessoa escolhe "Rodar junto" ou "Pausar a outra". Cada demanda mostra o próprio
  tempo e os próprios botões; a pílula do topo mostra quantas estão rodando.
- Horas de trabalho (Total do dia, Semana e Painel) contam uma vez só o trecho em que as demandas rodaram juntas;
  cada demanda continua com o tempo inteiro.
- Arquivos: `src/lib/cronometro.js`, `src/dados/demandas.js`, `src/lib/semana.js` (`horasDeTrabalho`),
  `src/telas/cronometro/`, `src/telas/quadro/useAcoesDoCartao.jsx`.
- Envio: `1cfdd1c`.

### 24/11/2026 · Tempo digitado sem a hora vale como minutos e segundos
- "05:00" digitado é 5 minutos (00:05:00), não 5 horas. Embaixo do campo aparece "Fica 00:05:00".
- A importação de planilha continua lendo "1:30" como 1 hora e 30 minutos, como o Excel mostra.
- Arquivos: `src/lib/tempo.js` (`lerTempoDigitado`), `src/componentes/Campos.jsx` (`AjudaDoTempo`).
- Envio: `0ec4fed`.

### 17/11/2026 · Calendário: indicadores clicáveis
- Postagens no mês, Em produção, Programadas, Postadas e Atrasadas abrem a lista das postagens daquela situação.
- Arquivos: `src/telas/postagens/Postagens.jsx`, `src/componentes/Indicadores.jsx`, `src/lib/postagens.js`.
- Envio: `cee9cc1`.

### 17/11/2026 · Tempo manual em demanda existente: somar ou corrigir o total
- A janela mostra o tempo atual e a conta, e tem "Corrigir o tempo total", que troca o Tempo Gasto sem sessão nova.
- Dados: a demanda "Artigo - Dia do Engenheiro Eletricista" foi corrigida à mão para 02:32:14.
- Arquivos: `src/telas/cronometro/JanelasDoCronometro.jsx`, `src/telas/quadro/JanelaTempoDoCartao.jsx`,
  `src/dados/demandas.js` (`trocarTempoGasto`).
- Envio: `ab6cfdc`.

### 17/11/2026 · Painel: Demandas por tipo mostra todos os tipos
- Sem juntar em "Outros", na linha inteira e com nomes completos; a Evolução também ocupa a linha inteira.
- Arquivos: `src/telas/painel/Painel.jsx`, `src/componentes/Grafico.jsx`.
- Envio: `8dcbe7f`.

### 16/11/2026 · Tipos da Marketing e da Gerência (só dados, no Firebase)
- As duas áreas estavam sem tipos e ninguém delas conseguia iniciar demanda. Foram copiados nove tipos da Designs
  para cada uma. O tipo "Horário do Almoço" saiu de todas as áreas.

### 11/11/2026 · Calendário e tempo manual pelo cartão
- A tela Postagens passou a se chamar Calendário (`#/calendario`), com altura fixa de 790 px.
- Botão "Adicionar tempo manual" na janela do cartão do Quadro.
- Envios: `634066d`, `6ce71b2`, `716a520`.

### 10/11/2026 · Seleção de cartões no Quadro
- Admin marca cartões e exclui em grupo; arrastar o fundo do Quadro rola para os lados.
- Envio: `11817a8`.

### 06/11/2026 · Ajustes de tempo e detalhes
- Total do dia, Semana e Painel acompanham o Tempo Gasto editado; botão Editar nos detalhes da demanda; o calendário
  do campo de data não é mais cortado pelas janelas.
- Envios: `e22b7f9`, `4275a78`, `6695a56`.

### 05/11/2026 · Postagens internas e correções do cronômetro
- Envio Interno, postagem interna (WhatsApp, Lideranças, Grupos do CAE), campo Caminho no cartão, botão para tirar
  do calendário; correção do cronômetro com relógio do computador errado.
- Envios: `d1a3ad6`, `150e9f8`, `de586d5`, `d727b3b`, `160f4b8`, `2ee61f5`, `45b928e`.

### 04/11/2026 · Fases 8 a 10: Quadro, Calendário de postagens e importação do Trello
- Quadro ligado ao cronômetro, calendário de postagens e importação do Trello por arquivo; correções do Juntar.
- Envios: `e0cd696`, `a7d920a`, `b881aff`, `31d84b1`, `a5c4a86`, `a8ce9de`, `8502442`.

### 31/10/2026 · Fases 1 a 7: o site
- Base com login do Google, administração, importação de planilha, Meu Cronômetro, Demandas, Semana, Painel e
  revisão geral.
- Envios: `bdc95e7` a `db80e7a`.
