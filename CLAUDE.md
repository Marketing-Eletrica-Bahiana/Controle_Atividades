# Controle de Atividades | Elétrica Bahiana (EB)

Cronômetro de atividades dividido por áreas (Designs, Marketing e Gerência). Cada área tem seus
próprios tipos de atividade e palavras-chave. Várias pessoas usam ao mesmo tempo, cada uma com o
próprio cronômetro, que só ela vê. Gestores e diretoria só leem.

- Repositório (público): https://github.com/Marketing-Eletrica-Bahiana/Controle_Atividades
- Endereço publicado: https://marketing-eletrica-bahiana.github.io/Controle_Atividades/

## Como trabalhar neste projeto

- Trabalhar em fases. Ao fim de cada fase: testar, fazer o commit, enviar para o GitHub e explicar
  em português simples como conferir. Esperar a aprovação antes de começar a fase seguinte.
- Toda a interface em português do Brasil.
- Nunca usar travessão nos textos da interface.
- Datas sempre exibidas como DD/MM/AAAA. Tempos sempre exibidos como HH:MM:SS.
- Nenhum e-mail da equipe em arquivo que vai para o repositório (código, documentação, testes,
  dados de exemplo). O repositório é público. Os cadastros ficam só no Firestore.
- Não mexer na pasta antiga `cronometro-eb` (outro projeto, fora deste repositório).

## Fases

1. Base: projeto Vite + React, marca e fontes em `public/`, estilos da identidade, login com
   Google (domínio, membro ativo e pedido de acesso), rotas com menu por papel e publicação
   automática no GitHub Pages.
2. Cadastros do admin (áreas, tipos, palavras-chave, listas, membros e pedidos de acesso) e
   importação da planilha `Cronometro_Atividades_Ivie_New_Version.xlsx`.
3. Cronômetro e registro de demandas, com classificação automática e regras de negócio.
4. Tela Demandas: lista, edição, reabertura, histórico e exportação Excel.
5. Semana e Painel, com gráficos.
6. Acabamento: celular, revisão visual e testes finais.

A ordem das fases 2 a 6 é uma proposta e pode mudar a cada aprovação.

## Tecnologia

- React + Vite (JavaScript, arquivos `.jsx`).
- Firebase: Authentication com Google e Firestore.
- Chart.js para gráficos.
- SheetJS (xlsx) para importar e exportar Excel.
- Ícones Lucide (`lucide-react`).
- Rotas com HashRouter (endereços com `#/`), para não dar erro 404 ao recarregar.
- Base do Vite: `"/Controle_Atividades/"`, com maiúsculas e minúsculas exatamente assim. Imagens
  e arquivos de `public/` são referenciados no código com `import.meta.env.BASE_URL` (ver
  `src/lib/marca.js`).
- Hospedagem no GitHub Pages, com publicação automática por GitHub Actions a cada envio na
  branch `main` (`.github/workflows/publicar.yml`). Em Settings > Pages, a origem precisa estar
  em "GitHub Actions".
- Login com `signInWithPopup`; se falhar no celular, usar `signInWithRedirect`.
- Fuso horário `America/Bahia`.
- Semana de trabalho: segunda a sábado.
- Campo de data próprio: aceita digitar DD/MM/AAAA e tem calendário em português começando na
  segunda. Não depender do formato de data do navegador.
- Node 24.

## Firebase

Projeto `controle-de-atividades-eb`, já configurado no console:

- Login com Google ativado.
- Domínio `marketing-eletrica-bahiana.github.io` autorizado.
- Firestore em `southamerica-east1`.
- Regras publicadas.
- Coleção `membros` já cadastrada.

Configuração usada em `src/firebase.js`:

```js
const firebaseConfig = {
  apiKey: "AIzaSyAbRbcDfBr5rmiwdG_nbc3E7Q6XNdpbMxo",
  authDomain: "controle-de-atividades-eb.firebaseapp.com",
  projectId: "controle-de-atividades-eb",
  storageBucket: "controle-de-atividades-eb.firebasestorage.app",
  messagingSenderId: "898778658314",
  appId: "1:898778658314:web:6e38aca449ab250e10d1f3"
};
```

A configuração web do Firebase não é segredo e pode ficar no repositório; quem protege os dados
são as regras do Firestore. Chave de conta de serviço e senha nunca vão para o repositório (ver
Segurança).

## Identidade visual (Endomarketing EB #EnergiaBahiana 2026)

### Paleta

Só estas 7 cores, e nenhuma outra, em fundos, textos, bordas, ícones ou gráficos:

| Cor | Nome | Uso |
|---|---|---|
| `#001780` | Azul Marinho EB | cabeçalho, fundos institucionais, títulos, cabeçalhos de tabela |
| `#0037ff` | Azul Brilhante EB | botões principais, destaques, cronômetro rodando |
| `#4069ff` | Azul Médio EB | elementos secundários, texto sobre fundo escuro |
| `#d4121a` | Vermelho EB | alertas, erros, avisos de campo faltando, excluir |
| `#a92a2e` | Vermelho Escuro EB | hover e variação do vermelho |
| `#ffffff` | Branco | fundos de conteúdo, texto sobre escuro |
| `#000000` | Preto | texto sobre fundo claro |

- Tons claros só como transparência dessas cores (ex.: `#4069ff` a 10% para linhas alternadas de
  tabela).
- Proibido amarelo, laranja, cinza, verde ou outros azuis. Por isso o botão de login usa ícone
  Lucide, e não o "G" colorido do Google.

### Gradientes

- Principal: `linear-gradient(135deg, #001780 0%, #0037ff 60%, #4069ff 100%)`
- Vermelho: `linear-gradient(135deg, #a92a2e 0%, #d4121a 100%)`
- Premium: `linear-gradient(135deg, #000000 0%, #001780 100%)`

### Fontes

Todas em `public/fontes/`, carregadas por `@font-face` em `public/fontes/fontes.css`:

- Lato em toda a interface, pelos arquivos locais `Lato-Light.ttf` (300), `Lato-Regular.ttf`
  (400), `Lato-Bold.ttf` (700) e `Lato-Black.ttf` (900), mais os itálicos. Licença em `OFL.txt`.
  Nome da família no CSS: `EB Lato`.
- Google Fonts (Lato 300, 400, 700 e 900) só como reserva, carregado sem bloquear a página. O site
  não depende de serviço externo para a fonte.
- Klavika para títulos de destaque e números grandes: `klavika-bold.otf`, `klavika-medium.otf` e
  `klavika-light.otf`. Os arquivos ainda não chegaram. Enquanto isso, cada `@font-face` da
  Klavika tem `Lato-Black.ttf` como segunda origem, então a alternativa Lato Black entra sozinha
  e a Klavika passa a valer assim que os arquivos forem colocados na pasta.

### Logos

Em `public/marca/logos/`. Cada arquivo é um quadrado de cerca de 1043 x 1043 px com o logo no
meio e muita área transparente; o componente `Logo` recorta essa sobra por CSS, sem alterar o
logo.

Atenção: no par azul os nomes estão trocados em relação ao formato. O código escolhe pelo formato
real:

| Formato real | Sobre fundo escuro | Sobre fundo claro |
|---|---|---|
| Uma linha (símbolo, nome e assinatura lado a lado) | `Logotipo_Horizontal_Branco.png` | `Logotipo_Vertical_Azul.png` |
| Compacto (símbolo ao lado do nome em duas linhas) | `Logotipo_Vertical_Branco.png` | `Logotipo_Horizontal_Azul.png` |
| Ícone, para espaços pequenos (180 x 180 px) | `Icone_Branco.png` | `Icone_Azul.png` |

- `Icone_Azul.png` é o favicon.
- Nunca recriar o logo em texto. Nunca aplicar sombra, rotação ou mudança de cor no logo.
- Título da aba do navegador: `Controle de Atividades | Elétrica Bahiana`.

### Patterns

Em `public/marca/patterns/`, PNG com fundo transparente:

- `Pattern_EB_1080x1080.png` e `Pattern_EB_1080x1920.png` (circuito): fundos de impacto. As linhas
  ficam só na faixa da direita da imagem.
- `Pattern_Endomarketing_1080x1080.png` e `Pattern_Endomarketing_1080x1920.png` (ondas): fundos
  discretos.
- Sobre o gradiente principal, com opacidade de 10 a 20%.

### Mascotes

Em `public/marca/mascotes/`: `Mascote_Ebinho.png` e `Mascote_Ebinha.png` (1080 x 1920 px, fundo
transparente).

- Só na tela de login, em telas vazias e em mensagens de boas-vindas.
- Nunca no Painel.
- Usar como estão.

### Conceito e detalhes

- Conceito visual: circuito elétrico; linhas finas em `#0037ff` com brilho sutil.
- Hashtag `#EnergiaBahiana` em Lato Black, sempre com essa grafia, no rodapé.
- Grade de 8px.
- Raios: 4px etiquetas, 8px cartões e botões, 16px janelas, 100px pílulas.
- Sombra de cartão: `0 2px 8px rgba(0,23,128,0.10)`.
- Sombra de janela: `0 8px 24px rgba(0,23,128,0.16)`.
- Transições de 200ms ease-out.
- Hover de botão: `brightness(0.92)` e `translateY(-1px)`.
- Hover de cartão: `translateY(-4px)`.
- Os valores acima estão como variáveis no topo de `src/styles.css`.

### Tabelas

- Cabeçalho `#001780` com texto branco em Lato Bold.
- Linhas alternadas em `#4069ff` a 10%.
- No celular, tabelas viram listas de cartões.

### Cores de situação

| Situação | Cor |
|---|---|
| em andamento | `#0037ff` |
| pausada | `#4069ff` |
| concluída | `#001780` |
| alerta | `#d4121a` |

### Tom

Empolgante, humano, direto, orgulho baiano. Assinatura: "Mais forte por você!".

## Áreas

- Coleção `areas/{id}`: `nome`, `ordem`, `ativa`.
- Áreas padrão: `designs` (Designs), `marketing` (Marketing) e `gerencia` (Gerência).
- O admin pode criar novas áreas pela tela, sem mexer no código.
- Áreas nunca são apagadas, só desativadas.
- Cada membro tem a lista `areas` com as áreas em que trabalha.
- Tipos de atividade, palavras-chave e demandas pertencem sempre a uma área.
- Na tela do cronômetro, cada pessoa vê abas só das áreas dela (sem abas se tiver uma só), e cada
  aba usa os tipos e palavras-chave daquela área.
- Nas telas Demandas, Semana e Painel: admin, gestor e diretoria escolhem qualquer área ou
  "Todas as áreas"; equipe vê só as próprias áreas.
- Toda consulta de demandas no código deve filtrar por área (as regras do Firestore exigem).
- Uma pessoa tem um só cronômetro rodando, mesmo trabalhando em mais de uma área.

## Equipe

Já cadastrada no Firestore. Não cadastrar de novo. Os e-mails ficam só no Firestore.

| Nome | Cargo | Papel | Área |
|---|---|---|---|
| Ivie | Designer | admin | designs |
| Taís | Designer | equipe | designs |
| Gleidiane | Auxiliar de Marketing | equipe | marketing |
| Adelaide | Gerente de Marketing | admin | gerencia |

O histórico da planilha `Cronometro_Atividades_Ivie_New_Version.xlsx` pertence ao Ivie, área
designs.

## Papéis

- `admin`: tudo, inclusive cadastrar pessoas, áreas, tabelas e listas.
- `equipe`: usa o cronômetro e registra demandas nas próprias áreas.
- `gestor`: vê tudo, não altera.
- `diretoria`: vê tudo, não altera, entra direto na tela Painel.

Só entram e-mails `@eletricabahiana.com.br`. A interface respeita as mesmas permissões das regras
do Firestore e esconde o que o papel da pessoa não pode usar. O menu por papel fica em
`src/lib/papeis.js`.

## Dados no Firestore

- `membros/{email}`: `nome`, `cargo` (texto livre, só informativo), `papel`, `areas` (lista),
  `ativo` (boolean). O ID do documento é o e-mail em minúsculas.
- `solicitacoes/{email}`: `nome`, `email`, `criadoEm`.
- `areas/{id}`: `nome`, `ordem`, `ativa`.
- `config/listas`: `publicos` (lista), `solicitantes` (lista).
- `tipos/{id}`: `area`, `nome`, `minH`, `maxH`, `publico`.
- `palavrasChave/{id}`: `area`, `palavra`, `tipo`.
- `demandas/{id}`:
  - `area`, `numero`, `mes` (ex.: `"2026-10"`), `tipo`
  - `dataSolicitacao`, `datasAjuste` (lista), `dataEntrega`
  - `tempoGastoSeg`
  - `usoIA` (`"Sim"`/`"Não"`), `usoTemplate` (`"Sim"`/`"Não"`)
  - `solicitante`, `publico`, `nome`
  - `tempoMinSeg`, `tempoMaxSeg`, `economizadoMinSeg`, `economizadoMaxSeg`, `prazoDias`
  - `responsavelEmail`, `responsavelNome`
  - `status`: `"em_andamento"` | `"pausada"` | `"concluida"`
  - `sessoes`: lista de `{inicio, fim, seg}`
  - `historico`: lista de `{quem, quando, acao, campo, antes, depois}`
  - `importada` (boolean), `arquivoOrigem`, `criadoEm`, `atualizadoEm`
- `cronometros/{email}`: `demandaId`, `area`, `inicio` (serverTimestamp), `rodando`.

## Listas padrão

Editáveis pelo admin em `config/listas`:

- Público: Interno, Externo, Interno e Externo, Endomarketing, Atividades de Rotina, Compras, DP,
  CAE, PIPE, Facilities.
- Solicitante: Marketing, RH, Diretoria, Comercial, Financeiro, Logística, Marketing / RH.

## Regras de negócio

- Nº: sequencial por mês, por área e por responsável. Renumerar ao mover ou excluir.
- Tempo mínimo, tempo máximo e público padrão vêm da tabela de tipos da área.
- Prazo cumprido (dias) = `dataEntrega` menos `dataSolicitacao`.
- Tempo economizado = maior valor entre zero e (tempo estimado menos tempo gasto), para mínimo e
  máximo. Calcular sempre, independente do Uso de IA.
- Preenchimento automático, com prioridade nesta ordem:
  1. Nome com "Trello": Uso de IA = Não, Template = Não.
  2. Tipo Reunião de Setor: Uso de IA = Não, Template = Não.
  3. Nome com "Claude": Uso de IA = Sim, Template = Não.

  Nos três casos, Solicitante = Marketing.
- Retomar ou reabrir uma demanda soma o tempo na mesma demanda. A Data de Entrega vira a data mais
  recente e as datas anteriores que não são solicitação nem entrega vão para `datasAjuste`, sem
  repetir. Nunca criar linha duplicada.
- Ajuste exibido como "DD e DD/MM" quando as datas são do mesmo mês.
- Ninguém vê o cronômetro de outra pessoa. Não existe painel "Equipe agora" nem botão de almoço. O
  tipo "Horário do Almoço" pode existir na tabela como qualquer outro.
- Demandas concluídas podem ser editadas e reabertas. Equipe edita e reabre só as próprias; admin,
  de todos.
- Toda alteração (edição de campo, edição de tempo, tempo manual, reabertura, junção) entra no
  `historico` da demanda.
- Tempo nunca negativo. Formato inválido mostra erro em `#d4121a`.

## Classificação automática do tipo

Usa os dados da área da demanda. Atualiza enquanto a pessoa digita o nome, nesta ordem de
prioridade:

1. Histórico: compara o nome com as demandas já registradas na área, sem diferenciar maiúsculas,
   acentos e pontuação, ignorando nomes de pessoas depois de " - " e palavras como "de", "do",
   "da", "para". Com nomes parecidos, sugere o tipo mais usado neles, dando preferência às demandas
   da própria pessoa e às mais recentes.
2. Palavras-chave: procura todas as palavras-chave da área que aparecem no nome e escolhe a mais
   específica, ou seja, a mais longa. Palavras de formato de rede social (reels, carrossel, story,
   stories, post, artigo) ganham de datas comemorativas.
3. Sem nenhuma pista, o campo fica em "Escolha o tipo", destacado em `#d4121a`.

Na tela:

- Embaixo do campo aparece a origem ("Sugerido pelo histórico: 12 demandas parecidas" ou
  "Sugerido pela palavra-chave 'reels'").
- Até 3 alternativas como etiquetas clicáveis em `#4069ff` a 10% com texto `#001780`.
- Se a pessoa trocar o tipo à mão, ele para de mudar sozinho naquela demanda.
- Mudar o tipo atualiza Público e estimativa de tempo.

## Exportação Excel

Colunas nesta ordem:

1. Tipo de Demanda
2. Data de Solicitação
3. Ajuste
4. Data de Entrega
5. Tempo Gasto
6. Uso de IA
7. Uso de Template
8. Solicitante
9. Público
10. Nome da Demanda
11. Nº
12. Tempo mínimo estimado sem IA (h)
13. Tempo máximo estimado sem IA (h)
14. Tempo economizado mín. com IA (h)
15. Tempo economizado máx. com IA (h)
16. Prazo cumprido (dias)

- Datas em DD/MM/AAAA, tempos em HH:MM:SS.
- Cabeçalho com fundo `#001780`, texto branco e fonte Lato.
- O arquivo exportado precisa poder ser importado de volta.

## Segurança

- Nunca colocar chave de conta de serviço ou senha no repositório.
- Nenhum e-mail da equipe no repositório (ver "Como trabalhar neste projeto").

## Notas técnicas para as próximas fases

- A versão gratuita do SheetJS não grava cor de fundo nem fonte nas células. Na fase da
  exportação, decidir como pintar o cabeçalho de `#001780` (por exemplo, com `xlsx-js-style`, que
  usa a mesma interface do SheetJS).
- O login por redirecionamento (`signInWithRedirect`) pode falhar em navegadores que bloqueiam
  cookies de terceiros (Safari no iPhone, por exemplo), porque o site está no GitHub Pages e o
  login no domínio do Firebase. O popup costuma funcionar no celular quando aberto pelo toque no
  botão.

## Pendências

- Arquivos da Klavika: colocar em `public/fontes/` quando chegarem (nomes acima).
- Planilha `Cronometro_Atividades_Ivie_New_Version.xlsx`: chega na Fase 2.
- Nomes trocados no par de logos azuis: se a marca corrigir os arquivos, ajustar a tabela de logos
  e `src/lib/marca.js`.
