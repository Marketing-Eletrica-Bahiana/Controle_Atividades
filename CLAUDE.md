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

1. (Feita) Base: projeto Vite + React, marca e fontes em `public/`, estilos da identidade, login
   com Google (domínio, membro ativo e pedido de acesso), rotas com menu por papel e publicação
   automática no GitHub Pages.
2. (Feita) Administração (tela `#/administracao`: pessoas e pedidos de acesso, áreas, tipos,
   palavras-chave, listas) e importação de planilha (ver "Importação de planilha").
3. (Feita) Tela Meu Cronômetro (`#/cronometro`, admin e equipe): abas por área, cartão do
   cronômetro, nova demanda com classificação e regras, retomar, pausar, concluir, corrigir
   início, tempo manual, lista de hoje com Editar e Reabrir.
4. (Feita) Tela Demandas (`#/demandas`): filtros, ordenação, detalhes com histórico, editar,
   reabrir, juntar, excluir (só admin), renumerar e "Exportar mês"
   (`Controle_Atividades_[Área]_Mes_MM-AAAA.xlsx`, "Todas" quando forem todas as áreas). Sem
   Uso de IA, Template ou Solicitante aparece em vermelho. Permissões em `src/lib/papeis.js`.
5. (Feita) Tela Semana (`#/semana`): segunda a sábado (domingo só se tiver trabalho), pessoa ou
   equipe toda, cartões de totais, demandas por dia. Tempo do dia vem das sessões; demanda sem
   sessões (importada) conta na data de entrega. "Tempo economizado com IA" soma as demandas com
   IA concluídas no período. Exportar Excel: aba Resumo + uma aba por pessoa
   (`Controle_Atividades_[Área]_Semana_DD-MM_a_DD-MM.xlsx`).
6. (Feita) Tela Painel (`#/painel`): área, período (semana, mês, intervalo) e pessoa; indicadores;
   gráficos Chart.js (`src/componentes/Grafico.jsx`) só com as cores da paleta na ordem pedida
   (no fundo escuro do modo apresentação o branco entra no lugar do marinho); evolução mês a mês
   desde julho de 2026; modo apresentação em tela cheia com o gradiente premium.
7. (Feita) Revisão geral: paleta, fontes, datas e tempos, permissões x regras, celular, exportar e
   importar de volta.

8. (Feita) Tela Quadro (`#/quadro`): quadro no estilo Trello ligado ao cronômetro (ver "Quadro de demandas").
9. (Feita) Tela Postagens (`#/postagens`): calendário de postagens externas, em que a demanda de
   postagem entra sozinha, na data da postagem (ver "Calendário de postagens").
10. (Feita) Importação do Trello por arquivo JSON, em Administração, aba Trello (ver "Importação do Trello").

Em 04/11/2026 a pessoa aprovou as fases 8 e 9 uma a uma e autorizou publicar a fase 10, a última planejada.
Mudanças novas voltam a pedir aprovação antes de publicar.

Em 31/10/2026 a pessoa autorizou fazer as fases 3 a 7 em sequência, com commit e publicação
ao fim de cada uma, e completar o que faltou da Fase 2 (roteiro completo dela: aba "Planilhas",
"Baixar tabela de referência" e "Testar classificação").

## Tecnologia

- React + Vite (JavaScript, arquivos `.jsx`).
- Firebase: Authentication com Google e Firestore.
- Chart.js para gráficos.
- SheetJS (xlsx) para importar e exportar Excel, versão 0.20.3 instalada do site oficial
  (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`); o pacote `xlsx` do npm está parado
  numa versão antiga. Carregado só quando a tela de importação precisa.
- Testes com Vitest (`npm test`), para as funções puras de `src/lib/`.
- Organização: `src/lib/` (funções puras e testes), `src/dados/` (leitura e gravação no
  Firestore), `src/hooks/`, `src/componentes/`, `src/telas/`.
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

O histórico da área designs vem da planilha `relatorio_designers_atualizado.xlsx`, que tem as
demandas do Ivie e da Taís juntas; a coluna Responsável diz de quem é cada linha.

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
  - `manual` (`true` só nas demandas criadas pelo lançamento manual)
  - `cartaoId` (cartão do Quadro ligado a ela, ou `null`)
- `cartoes/{id}`: `titulo`, `descricao`, `caminho` (pasta do conteúdo no computador, texto livre; cartão antigo não tem), `coluna`, `ordem`, `etiquetas` (lista), `responsaveis` (lista de
  e-mails), `prazo`, `entregue` (boolean), `entregueEm`, `mesEntrega` (ex.: `"2026-10"`), `vinculos` (lista
  de `{demandaId, area, email, nome}`), `comentarios` (lista de `{email, nome, quando, texto}`), `historico`,
  `criadoPor`, `criadoEm`, `atualizadoEm`, `postagem` (`{data, redes, formato}`, e `estimada` e
  `redeAConfirmar` quando vierem da importação; `null` quando não é postagem) e `postagemMes`
  (ex.: `"2026-11"`, para o calendário consultar). Só nos importados: `origem: "trello"` e `trello`
  (`{id, url, ultimaAtividade, importadoEm}`). O ID desses documentos é `trello-{id do cartão}`.
- `config/quadro`: `colunas` (lista de `{id, nome}`). Sem esse documento, valem as colunas padrão de
  `src/lib/quadro.js`.
- `cronometros/{email}`: `demandaId`, `area`, `inicio` (serverTimestamp), `rodando`.

Convenções de gravação (definidas na Fase 2):

- Datas (`dataSolicitacao`, `datasAjuste`, `dataEntrega`) são texto `"AAAA-MM-DD"`, sem hora e
  sem fuso; `null` quando não informadas. "Hoje" sempre no fuso America/Bahia (`src/lib/datas.js`).
- Tempos em segundos inteiros (`...Seg`). Em `tipos`, `minH` e `maxH` ficam em horas decimais.
- `tipos` também guarda `prazoEstimadoDias` (número ou `null`), pedido para mostrar "Dentro do
  prazo?" nas próximas fases.
- IDs previsíveis: `tipos/{area}--{nome-sem-acento}` e `palavrasChave/{area}--{palavra}`, para
  reimportar sem duplicar. Áreas novas usam o nome sem acento como ID.
- `usoIA` e `usoTemplate` podem ficar `""` quando a planilha antiga não informava.
- `historico[].quando` é um Timestamp do momento (o `serverTimestamp` não funciona dentro de
  listas).
- Consultas por área usam só `where` (sem `orderBy`), para não exigir índice composto; a ordem é
  feita no navegador.

## Cronômetro (definido na Fase 3)

Código em `src/dados/demandas.js` (gravação, em transações) e `src/telas/cronometro/`.

- `cronometros/{email}` parado fica `{ rodando: false, demandaId: null, area: null, inicio: null }`.
  O tempo na tela é sempre "agora menos `inicio`", então continua certo ao fechar a aba ou trocar
  de computador.
- Um cronômetro por pessoa: iniciar ou retomar outra demanda pergunta antes e pausa a atual na
  mesma transação.
- `inicio` é a hora do servidor, e o relógio do computador pode estar diferente. Atrasado, o cronômetro ficava
  parado em 00:00:00 e pausar gravava zero. Por isso, o tempo usa `agoraNoServidor()` (`src/lib/relogio.js`),
  com a diferença medida a cada vez que a pessoa liga o cronômetro. Nunca usar `Date.now()` para calcular sessão.
- A medição do relógio lê dentro de uma transação. `getDoc` e `getDocFromServer` em documento já escutado devolvem a última
  foto, de antes da gravação: em 05/11/2026 isso deixou o cronômetro parado e, ao trocar de demanda sem pausar, gravou zero.
  A demonstração de `.claude/` imita esse comportamento (`?escuta=ms`, `?rede=ms`, `?atraso=segundos`).
- `sessoes`: `{ inicio, fim, seg }` (Timestamp); tempo manual acrescenta `manual: true`, às 08:00
  da data escolhida, e a data entra em `datasAjuste`.
- Mês e Nº: a demanda pertence ao mês em que foi criada. Se a Data de Entrega for editada para
  outro mês, ela vai para o fim desse mês e o mês antigo é renumerado.
- Lançamento manual (janela "Adicionar tempo manual", opção "Nova demanda"): para o período de
  adaptação, cria a demanda já com o tempo, sem ligar nem pausar o cronômetro. Ela pertence ao mês da
  data informada, não ao mês de hoje. Concluída, a data vira a Data de Entrega; em aberto, fica
  pausada e a data vai para o Ajuste. Conta como demanda do cronômetro (`importada: false`), então
  "Substituir histórico" não a apaga.
- Concluir grava a entrega de hoje; os outros dias com sessão, a entrega anterior (se foi reaberta)
  e os ajustes já existentes vão para `datasAjuste`, sem solicitação e entrega, sem repetir.
  Faltando Uso de IA, Template ou Solicitante, uma janela pede antes de concluir.
- Reabrir: concluída volta para "pausada" e aparece na busca do formulário para retomar.
- `historico[].acao`: `criacao`, `conclusao`, `reabertura`, `edicao`, `edicao_tempo`,
  `tempo_manual`, `juncao`, `importacao`. `antes` e `depois` já vêm formatados para leitura
  (DD/MM/AAAA, HH:MM:SS).
- Classificação (`src/lib/classificacao.js`): o histórico ignora demandas cujo nome é só o tipo
  (planilhas antigas). Nos dados reais de designs acertou 59% (histórico antes das palavras-chave,
  como pede a regra); o resto vem de nomes parecidos com tipos diferentes na planilha.

## Quadro de demandas (Fase 8)

Código em `src/lib/quadro.js` (regras puras), `src/dados/cartoes.js` e `src/telas/quadro/`.

- O cartão é separado da demanda: existe antes de alguém ligar o cronômetro e reúne o tempo de várias
  pessoas. Cada pessoa tem a própria demanda ligada ao cartão (`vinculos` e `cartaoId`). Assim, Nº,
  Semana, Painel e exportações continuam contando só o trabalho real, por pessoa.
- Colunas iguais às do Trello. As listas "Prontos e entregues" de cada mês viram uma coluna só,
  Entregues, filtrada por mês. O admin edita as colunas em Administração, aba Quadro. Entregues não pode
  ser removida, e coluna com cartão precisa ser esvaziada antes.
- Iniciar pelo cartão: a primeira vez de cada pessoa abre uma janela com área, tipo e demais campos, e
  cria a demanda dela. Depois o botão só retoma ou pausa. Vale a regra de um cronômetro por pessoa.
- Cartão em Entregues não conclui demanda sozinho, nem demanda concluída move cartão (ainda pode faltar
  aprovação). Ao entregar, quem moveu é perguntado se quer concluir a própria demanda.
- Na demanda nova, no cronômetro ou no lançamento manual, "Criar cartão no Quadro" é escolha da pessoa. O padrão
  vem do Público: Interno, Endomarketing e CAE vêm marcados; Externo e Interno e Externo vêm desmarcados, por pedido
  da pessoa em 05/11/2026 (legendas e afins nem sempre viram cartão); rotina também. O cartão é gravado depois da
  demanda: se falhar, o tempo continua valendo e a pessoa é avisada.
- Permissões: admin e equipe criam, editam e movem qualquer cartão; só o admin exclui; gestão e diretoria
  só leem. Excluir o cartão não apaga as demandas.
- Etiquetas só com as cores da paleta (`.etiqueta-cartao--*` em `src/styles.css`).
- No celular, arrastar não funciona: mude de coluna pelo campo Coluna da janela do cartão.
- Excluir ou juntar uma demanda atualiza `vinculos` no cartão: ele não pode apontar para demanda apagada. Ao
  juntar, a que fica herda o cartão da que sai, se ainda não tiver um. Não dá para juntar demanda em
  andamento: apagá-la deixaria o cronômetro preso.
- Anexos ainda não entram no quadro: o projeto está no plano gratuito (Spark) do Firebase. Arquivos seguem
  na pasta da rede, com o endereço no campo Caminho do cartão. O navegador não deixa um site abrir pastas do
  computador: o botão Copiar leva o caminho para colar no Explorador de Arquivos, e quem só lê também pode copiar.

## Calendário de postagens (Fase 9)

Código em `src/lib/postagens.js` (regras puras), `src/telas/postagens/` e `src/componentes/CamposDaPostagem.jsx`.

- A postagem é um campo do cartão, não uma coleção à parte: o calendário e o Quadro leem o mesmo dado.
- Postagens externas em Instagram, LinkedIn, LinkedIn do CAE, YouTube e YouTube Shorts. A data de postagem é
  diferente do prazo do cartão: no Trello, 46 de 51 cartões comparados tinham datas diferentes.
- Comunicação interna: WhatsApp e Lideranças (`GRUPOS_INTERNOS`), gravados em `postagem.redes`. As opções aparecem com
  Comunicação Interna ou Endomarketing no cartão, ou público Interno, Interno e Externo ou Endomarketing no cronômetro. Marcar
  a etiqueta não liga a postagem sozinha, porque nem todo cartão interno vai para um grupo. Com a opção marcada, entra no
  calendário junto com as externas, e o filtro Rede tem Só externas e Só internas. O leitor do Trello só procura `REDES`.
- A grade do calendário vai de domingo a sábado, por pedido da pessoa. O campo de data e a tela Semana continuam
  começando na segunda.
- As redes e os grupos internos aparecem com os ícones de `public/marca/icones/`, nas cores originais: é a única exceção à
  paleta, por pedido da pessoa. O LinkedIn do CAE usa o ícone do CAE. Os ícones também aparecem no cartão do Quadro.
- Cada pessoa tem uma cor de bolinha, dentro da paleta (`corDaPessoa` em `src/lib/quadro.js`), no Quadro e no
  calendário.
- A postagem entra sozinha no calendário por quatro caminhos: botão Nova postagem ou "+" no dia; cartão
  (qualquer cartão com a opção "É postagem em rede social"); Meu Cronômetro; lançamento manual. Nos dois
  últimos, a postagem mora no cartão: a opção só aparece com "Criar cartão no Quadro" marcado e, no público Externo ou
  Interno e Externo, já vem marcada junto com o cartão.
- Sem data, a postagem em andamento fica na lista "Sem data", abaixo do calendário. Cartão gravado antes
  desta fase, sem o campo, conta como postagem se tiver a etiqueta Comunicação Externa.
- Arrastar no calendário muda a data e fica no histórico do cartão. No celular, o calendário vira agenda só
  com os dias que têm postagem (e hoje), e a data muda pela janela do cartão.
- A situação não é preenchida, vem da coluna e da data: em produção; atrasada (data passada e sem estar
  pronta); programada (em Legendado - Programado ou Entregues, com data futura); postada (nessas colunas,
  com data de hoje ou passada). Por isso, depende do ID `legendado-programado` da coluna.
- O site só registra e organiza: não publica nem confere nada no Instagram ou no LinkedIn.

## Importação do Trello (Fase 10)

Código em `src/lib/trello.js` (leitura pura), `src/dados/importacaoTrello.js` e
`src/telas/cadastros/ImportarTrello.jsx`. Os cartões reais nunca entram no repositório: o admin escolhe o
arquivo na tela. O teste usa dados de exemplo.

- Por decisão da pessoa, o Trello continua em uso. Como o site não tem servidor, nada sincroniza sozinho: a
  importação é por arquivo e pode ser repetida.
- O arquivo vem do link da própria tela, que pede só os comentários. A exportação padrão do Trello traz só as
  1000 ações mais recentes de todos os tipos e perderia comentários. Limite de 1000 comentários por arquivo.
- Repetir não duplica. Cartão sem atividade nova no Trello fica igual; com atividade nova é atualizado, mantendo
  o tempo e os comentários feitos no site. Se também mudou no site depois da importação (`atualizadoEm` depois
  de `trello.importadoEm`), fica a versão do site, a não ser que o admin marque a troca na prévia.
- Cartão arquivado ou excluído no Trello não entra, e o que já foi importado não é apagado.
- Listas "Mês - Prontos e entregues" viram Entregues, no mês da lista. O nome não tem ano: vale o último
  daquele mês até a atividade do cartão, com um mês de folga (cartão de janeiro mexido em dezembro é do
  janeiro seguinte). O Trello não guarda o dia da entrega: usa o prazo ou a atividade, se forem daquele mês.
- Lista que não existe como coluna vira coluna nova. Membros são ligados às pessoas pelo nome, com correção
  na prévia. Anexos ficam no Trello: o cartão tem o link "Ver anexos e imagens no Trello".
- Postagem: quem tem o modelo "Postagem nas Redes Sociais" tem data exata, salvo comentário de reprogramação
  (fica estimada). O modelo com rede que o calendário não acompanha, como TikTok, fica fora dele. Cartão com a etiqueta
  Comunicação Externa e sem o modelo usa, nesta ordem: comentário, campo "Postagem:", linha da descrição que
  fale em postar, prazo e entrega, sempre como `estimada`. Sem rede citada, fica `redeAConfirmar`. O prazo não
  serve como data exata. Sem ano escrito, a data vem depois da criação do cartão, com 45 dias de folga.
- Conferência no quadro real em 04/11/2026: 581 cartões, 47 arquivados, 194 postagens (55 exatas, 135
  estimadas, 4 sem data, 58 com rede a confirmar), e as entregas por mês iguais às listas do Trello.

## Importação de planilha

Tela Administração, aba Planilhas (`#/administracao/planilhas`). `src/lib/planilha.js` lê,
`src/lib/importacao.js` monta e faz as prévias, `src/dados/importacao.js` grava. As colunas são
achadas pelo nome do cabeçalho; coluna que falta fica vazia:

- O papel de cada aba (Demandas do mês, Tipos de atividade, Palavras-chave, Listas, Ignorar) é
  identificado sozinho e pode ser corrigido na tela antes de seguir.
- Caixas de marcar: Tipos de atividade, Palavras-chave, Demandas e "Público e Solicitante novos".
  Dá para atualizar só as palavras-chave sem mexer em mais nada.
- Tipos e palavras-chave da planilha **substituem** a lista da área; a prévia mostra o que entra,
  sai e muda.
- Data de Entrega como "08/07 e 09/07/2026": a última é a entrega, as outras vão para o Ajuste.
- Linha sem nome e sem tempo é ignorada; tempo sem nome vira erro listado.
- Responsável só entre as pessoas ativas da área.
- "Substituir histórico": apaga antes as demandas importadas da pessoa nos meses da planilha.
  Demandas do cronômetro nunca saem; as importadas são numeradas depois delas. Sem a opção, mês
  já importado fica de fora (aviso em vermelho). Confirmação antes de gravar.
- "Baixar tabela de referência" gera o .xlsx com as abas Tipo de Atividade e Palavras-chave da área.
- Arquivos gerados usam ExcelJS (`src/lib/excel.js`, cabeçalho #001780 com texto branco em Lato);
  a leitura usa SheetJS. A exportação acrescenta a coluna Responsável no fim (depois das 16 do
  padrão) para o arquivo com várias pessoas voltar na importação. `src/lib/excel.test.js` garante
  que o arquivo exportado é lido de volta igual.
- Aba Testar classificação: testa um nome e calcula o acerto em todas as demandas da área, com
  atalho para criar a palavra-chave que faltou.

Detalhes que valem desde a primeira versão:

- Formatos aceitos: abas de mês da planilha antiga ("Julho 2026", com Nome da Demanda, Nº e
  Ajuste), abas "Relatório Designers - Mês" (nome da tarefa em Tipo de Demanda e o tipo em Tipo de
  Atividade) e a futura exportação do sistema. Abas Tipo de Atividade, Palavras-chave e Listas
  também são lidas.
- Coluna **Responsável** (nome, primeiro nome ou e-mail) liga cada linha a uma pessoa; a prévia
  mostra a ligação para conferir. Sem a coluna, escolhe-se uma pessoa para a planilha toda.
  A planilha `relatorio_designers_atualizado.xlsx` mistura Ivie e Taís sem dizer quem fez cada
  linha: a coluna Responsável precisa ser preenchida antes de importar.
- Mês da demanda: o da aba quando a aba diz o mês; senão, o da data.
- Nº renumerado de 1 em diante por pessoa e mês (segue o Nº da planilha quando todas as linhas
  têm Nº). Economia e prazo cumprido são recalculados; tempo e público em branco vêm da tabela de
  tipos.
- Nunca duplica: sem "Substituir histórico", mês já importado fica de fora.

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
- Para ver telas internas sem login, dá para subir o Vite com uma configuração de demonstração
  fora do repositório (em `.claude/`, que é ignorada), usando `resolve.alias` para trocar
  `acesso/ProvedorAcesso.jsx`, `hooks/useConsulta.js` e `dados/importacao.js` por versões com
  dados de mentira. Nunca gravar no Firestore real a partir dessa demonstração.

## Pendências

- Arquivos da Klavika: colocar em `public/fontes/` quando chegarem (nomes acima).
- Regras do Firestore: conferidas no console em 04/11/2026. As publicadas não são iguais a
  `firestore.rules`: usam outros nomes de função (`membro()` no lugar de `ativo()`, `verTudo()`,
  `meuEmail()`). Não colar o arquivo inteiro no console sem comparar antes. A equipe precisa poder apagar as
  próprias demandas, porque Juntar apaga a repetida, embora o botão Excluir seja só do admin. Resumo do que o app grava, como
  admin, em `areas`, `membros`, `solicitacoes` (apaga ao liberar ou recusar), `tipos`,
  `palavrasChave`, `config/listas`, `config/quadro`, `demandas` e `cartoes`. As regras não são publicadas
  pelo GitHub Actions: coleção nova precisa estar publicada no console **antes** de o código ir para o ar.
  `cartoes` foi publicada à mão em 04/11/2026.
- Coluna Responsável na `relatorio_designers_atualizado.xlsx` antes da importação real.
- Nomes trocados no par de logos azuis: se a marca corrigir os arquivos, ajustar a tabela de logos
  e `src/lib/marca.js`.

## Revisão (Fase 7)

- Cores: só as 7 da paleta e transparências delas, inclusive nos gráficos (Chart.js sem o cinza
  padrão) e no Excel (cabeçalho #001780, texto branco; sem zebra, que exigiria um tom fora da paleta).
- Fontes: Lato (local) e Klavika (com Lato Black de alternativa), sem outras famílias nomeadas.
- Logo só como imagem oficial (componente `Logo`), nunca em texto.
- Datas em DD/MM/AAAA e tempos em HH:MM:SS em todas as telas, inclusive "Corrigir início".
- Toda consulta de demandas filtra por área (`src/dados/demandas.js` e `src/dados/importacao.js`).
- Endereços com `#/` recarregam sem 404; `public/404.html` leva endereços sem `#` para a rota certa.
- `src/lib/excel.test.js` garante que os arquivos exportados (mês, semana e tabela de referência)
  voltam iguais na importação.

## Cuidado com telas que redesenham sem parar

Em 31/10/2026 a aba Planilhas travava o navegador: `useMembros` devolvia uma lista nova a cada
desenho, e um `useEffect` que dependia dela gravava estado, o que pedia outro desenho, sem fim.
Regras desde então:

- Hooks de dados (`useAreas`, `useMembros`, `useTipos`, `usePalavras`) devolvem listas
  memorizadas com `useMemo`, que só mudam quando o Firestore manda dados novos.
- Não gravar estado em `useEffect` a partir de valores calculados; calcular com `useMemo` e guardar
  em estado só o que a pessoa escolheu na tela.
- Para conferir, abrir as telas e procurar no console "Maximum update depth exceeded".
