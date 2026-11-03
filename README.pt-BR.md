<p align="center"><img src="docs/assets/repolens.gif" alt="RepoLens transforma um README do GitHub em uma explicação simples, com o original disponível em um clique." width="960"></p>

# RepoLens

**Entenda os projetos do GitHub.** Extensão leve para Chrome que explica READMEs em linguagem simples, na própria página.

[English](README.md) · [Licença MIT](LICENSE)

Descubra o que o projeto faz, para quem ele serve e o que conferir antes de experimentar. Escolha a geração manual ou automática no popup da extensão. Alterne entre o README original e o resumo já gerado sem outra chamada à IA. Os arquivos do repositório ficam intactos.

- Escolha quando gerar: o modo manual é o padrão; ative o automático no popup para receber resumos ao carregar a página.
- Português brasileiro e inglês automáticos, seguindo o idioma da interface do Chrome. Isso inclui configurações, controles, erros e instruções para a IA.
- Use seu próprio provedor e modelo compatível com Chat Completions.
- Gere novamente ou recupere o original com um clique.
- Sem dependências de execução, telemetria, fontes externas ou ícones animados.

Idiomas portugueses usam pt-BR; os demais usam inglês. Após mudar o idioma da interface do Chrome, reinicie o navegador e atualize as abas. A animação do cabeçalho usa um repositório fictício e um resumo de exemplo; não é uma gravação de uma resposta real da IA.

## Instalar

1. Baixe em **Code → Download ZIP** e extraia para uma pasta fixa, ou clone o repositório.
2. Abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta que contém `manifest.json`.
4. Clique no ícone do RepoLens e em **Configurações do provedor** para configurar sua IA.

Não precisa instalar Node.js nem compilar. A instalação local não tem atualização automática.

## Configurar

Informe o endereço completo de Chat Completions, o nome exato do modelo e a chave da API, quando exigida. Salve, autorize o domínio do provedor e atualize a página de um repositório.

Exemplos de endereços:

- OpenRouter: `https://openrouter.ai/api/v1/chat/completions`
- Groq: `https://api.groq.com/openai/v1/chat/completions`
- Cerebras: `https://api.cerebras.ai/v1/chat/completions`
- Servidor local: `http://localhost:PORT/v1/chat/completions`

Escolha um modelo disponível no seu provedor. A chave de API é independente de uma assinatura de chat. O provedor pode cobrar pelo uso e impor limites.

## Escolher entre modo manual e automático

Clique no **ícone do RepoLens na barra do Chrome** para abrir **Preferências de leitura**. Use a opção **Gerar automaticamente**:

| Modo | Opção | O que acontece |
| --- | --- | --- |
| **Manual (padrão)** | Desativada | O README original permanece visível. Clique em **Gerar resumo** acima dele para pedir uma explicação. |
| **Automático** | Ativada | O RepoLens pede um resumo ao abrir, atualizar ou navegar para a página principal de um repositório com um README legível. |

A preferência fica salva neste dispositivo. Alterá-la **não** gera um resumo na aba atual; a mudança vale no próximo carregamento ou navegação. Desative a opção para voltar ao modo manual. O RepoLens também precisa estar ativado em **Configurações do provedor** para qualquer um dos modos funcionar.

Após a geração, use **Ver README original** ou **Ver explicação clara** para alternar sem outra chamada à IA. **Gerar novamente** faz um novo pedido; falhas oferecem **Tentar novamente** e não provocam tentativas automáticas.

**O modo automático pode consumir tokens a cada abertura ou atualização e envia o README ao provedor configurado, inclusive em repositórios privados acessíveis à sua conta.** Deixe-o desativado para decidir antes de enviar cada README.

## Privacidade e limites

O texto visível do README, limitado a 50 mil caracteres, e a URL do repositório são enviados ao provedor escolhido. Endereço, modelo, chave e preferências de ativação/geração automática ficam no armazenamento local da extensão. A extensão não criptografa a chave. Não existe servidor próprio do RepoLens nem telemetria.

O script atua na página principal dos repositórios. Ele não verifica a visibilidade: **READMEs privados acessíveis à sua conta também podem ser enviados ao provedor**. Mantenha a geração automática desativada e não clique em **Gerar resumo** ou **Gerar novamente** nesses repositórios se não quiser enviar esse conteúdo. A extensão não analisa os arquivos de código nem comprova afirmações dos autores. Confira a documentação original; a IA pode errar e textos cortados podem perder ressalvas. Mudanças no GitHub podem exigir ajustes na extensão.

## Desenvolvimento

Com Node.js 22+, rode `npm test`. Não há etapa de compilação. Após alterar o código, recarregue a extensão e atualize as abas do GitHub. As traduções ficam em `_locales/en` e `_locales/pt_BR`.

O projeto de animação fica em [docs/demo](docs/demo), separado da execução da extensão.

[MIT](LICENSE) © 2026 Jean Lorencini. Projeto independente, sem vínculo com o GitHub.
