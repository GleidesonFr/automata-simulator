# Simulador de AFN-ε

Este projeto permite criar e executar autômatos finitos não determinísticos com
transições vazias. A simulação mostra o processamento da palavra passo a passo,
incluindo o fecho-ε, os estados alcançáveis e a justificativa do resultado.

## Acesso pela internet

Não é necessário instalar nada para usar a versão publicada:

**[Acessar o Simulador de AFN-ε](https://automata-simulator-aftc.onrender.com/)**

Se o serviço estiver inativo no momento do primeiro acesso, aguarde alguns
instantes e atualize a página.

## Tutorial de uso

### 1. Defina o autômato

Ao abrir a aplicação, já existe um autômato de exemplo no campo **JSON do
autômato**. É possível trabalhar de duas formas:

- editar diretamente o JSON exibido; ou
- selecionar **Carregar JSON** e escolher um arquivo do computador.

Os arquivos da pasta [`examples`](examples/) podem ser usados como exemplos.

### 2. Escolha a palavra

Na seção **Simulação**:

- selecione uma opção em **Palavra carregada do JSON**, caso o arquivo possua o
  campo `words`; ou
- escreva uma palavra no campo **Palavra manual**.

Para testar a palavra vazia, deixe o campo manual sem caracteres ou selecione
`ε (palavra vazia)` na lista.

### 3. Inicie a simulação

Use um dos botões:

- **Simular palavra**: processa somente a palavra selecionada ou digitada;
- **Simular todas**: processa todas as palavras declaradas em `words` no arquivo
  JSON.

O botão **Simular todas** só fica funcional quando um arquivo com a lista
`words` foi carregado.

### 4. Acompanhe o diagrama

Depois de iniciar a simulação, o diagrama usa cores diferentes para representar
a configuração do passo selecionado:

- **azul escuro**: estado atual usado para consumir o símbolo;
- **verde claro**: estado alcançado diretamente pela transição do símbolo;
- **azul claro**: estado acrescentado pelo fecho-ε;
- **anel duplo**: estado final do autômato;
- **vermelho**: rejeição; quando nenhum estado permanece ativo, aparece o nó
  virtual `∅`.

As arestas destacadas seguem a mesma ideia: a transição pelo símbolo mostra o
movimento atual e as transições ε mostram a expansão do fecho-ε.

### 5. Percorra a computação

Na seção **Linha do tempo**, use **Anterior** e **Próximo**, ou selecione
diretamente um número da linha do tempo.

- O passo `0` apresenta o estado inicial e seu fecho-ε.
- Cada passo seguinte corresponde a um símbolo consumido da palavra.
- O cartão **detalhe do passo** apresenta os estados ativos anteriores, as
  transições utilizadas, os destinos diretos, as transições ε e o conjunto
  ativo resultante.
- **Processamento textual completo** reúne todos os passos em uma lista.

No último passo, o simulador exibe `ACEITA` ou `REJEITADA` e calcula:

```text
estados ativos finais ∩ F
```

A palavra é aceita somente quando essa interseção não é vazia.

### 6. Revise várias palavras

Depois de selecionar **Simular todas**, a seção **Resultados de múltiplas
palavras** apresenta uma tabela. Selecione uma linha para abrir e percorrer os
passos daquela palavra.

## Formato do arquivo JSON

Um arquivo de entrada pode seguir este modelo:

```json
{
  "states": ["q0", "q1", "q2"],
  "alphabet": ["a", "b"],
  "initial_state": "q0",
  "final_states": ["q2"],
  "transitions": {
    "q0": {
      "a": ["q0"],
      "ε": ["q1"]
    },
    "q1": {
      "b": ["q2"]
    },
    "q2": {}
  },
  "words": ["b", "ab", "aab", ""]
}
```

Significado dos campos:

| Campo | Descrição |
| --- | --- |
| `states` | Lista de todos os estados do autômato. |
| `alphabet` | Símbolos permitidos nas palavras. Não inclua `ε`. |
| `initial_state` | Estado em que a computação começa. |
| `final_states` | Conjunto `F` de estados de aceitação. |
| `transitions` | Transições agrupadas pelo estado de origem e pelo símbolo. |
| `words` | Lista opcional de palavras para a simulação em lote. |

Regras importantes:

- cada destino de uma transição deve ser uma lista, mesmo que exista apenas um;
- use exatamente `ε` para representar uma transição vazia;
- todos os estados de origem e destino precisam existir em `states`;
- todo símbolo de uma transição, exceto `ε`, precisa existir em `alphabet`;
- a string vazia `""` dentro de `words` representa a palavra vazia.

## Instalação local com Docker

Esta é a forma recomendada de executar o projeto localmente.

### Pré-requisitos

- Docker Desktop, no Windows ou macOS; ou Docker Engine, no Linux;
- Docker Compose.

### Execução

1. Baixe ou clone este repositório.
2. Abra um terminal na pasta raiz do projeto.
3. Execute:

```bash
docker compose up --build
```

4. Acesse <http://localhost:8001/> no navegador.

O mesmo container entrega o frontend e os endpoints do FastAPI. Para conferir
se o serviço está saudável, acesse <http://localhost:8001/health>.

Para encerrar:

```bash
docker compose down
```

### Usar outra porta

No Linux ou macOS:

```bash
APP_PORT=8080 docker compose up --build
```

No PowerShell:

```powershell
$env:APP_PORT = "8080"
docker compose up --build
```

Nesse caso, acesse <http://localhost:8080/>.

## Instalação local sem Docker

É necessário ter Python instalado. Na raiz do projeto, crie um ambiente virtual
e instale as dependências:

```bash
python -m venv .venv
```

Ativação no Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Ativação no Linux ou macOS:

```bash
source .venv/bin/activate
```

Depois execute:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
```

Acesse <http://localhost:8001/>. Para interromper o servidor, pressione
`Ctrl+C` no terminal.

## Executar os testes

Com o ambiente virtual ativo e as dependências instaladas:

```bash
cd backend
pytest -q
```

## Endpoints

| Método | Caminho | Finalidade |
| --- | --- | --- |
| `GET` | `/` | Abre a interface do simulador. |
| `GET` | `/health` | Verifica a saúde do serviço. |
| `POST` | `/simulate` | Executa a simulação enviada pela interface. |

## Publicação no Render

O [`render.yaml`](render.yaml) descreve um Blueprint com um único Web Service
Docker. Para publicar outra instância:

1. envie o repositório para um provedor Git compatível com o Render;
2. no painel do Render, escolha **New > Blueprint**;
3. conecte o repositório;
4. confirme o serviço encontrado no `render.yaml` e aplique o Blueprint.

Não é necessário cadastrar a variável `PORT`: o Render fornece esse valor ao
Web Service. O container inicia o Uvicorn em `0.0.0.0` e o healthcheck consulta
`/health`.

O `docker-compose.yml` é destinado à execução local. A publicação no Render é
configurada pelo `render.yaml`.

## Problemas comuns

- **A página não abre localmente:** confirme que o container ou o Uvicorn está
  em execução e que a porta escolhida está livre.
- **Erro ao carregar o arquivo:** verifique se o conteúdo é um JSON válido e se
  segue os nomes de campos apresentados neste tutorial.
- **Símbolo inválido:** confira se todos os caracteres da palavra e das
  transições pertencem a `alphabet`; `ε` é permitido apenas nas transições.
- **O botão “Simular todas” apresenta erro:** carregue um JSON que contenha uma
  lista `words`.
