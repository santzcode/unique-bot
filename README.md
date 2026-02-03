markdown
# 🤖 Bot de Whitelist / Gerenciamento Discord

Este projeto é um **bot para Discord** em Node.js que gerencia **whitelist, staff, tickets e logs** de forma automática.

---

## 🚀 Instalação e Dependências

Para que o bot funcione corretamente, você precisa instalar as bibliotecas necessárias manualmente no seu terminal:

1. **Instale a biblioteca principal:**
   ```bash
   npm install discord.js

```

2. **Inicie o bot:**
```bash
node index.js

```



---

## 📦 Requisitos

Antes de começar, você precisa ter:

* [Node.js](https://nodejs.org/) **v16 ou superior**
* NPM (instalado automaticamente com o Node.js)
* Um bot criado no [Discord Developer Portal](https://www.google.com/search?q=https://discord.com/developers/applications)

---

## ⚙️ Configuração

1. Abra o arquivo `config.js`.
2. Substitua os **placeholders** pelos IDs reais do seu servidor e URLs:

```js
CHANNELS: {
  WL_OPEN: '<ID_DO_CANAL_ONDE_A_WHITELIST_ESTA_ABERTA>',
  WL_STAFF: '<ID_DO_CANAL_INTERNO_DA_EQUIPE_DA_WHITELIST>',
  WL_RESULT: '<ID_DO_CANAL_ONDE_SAI_O_RESULTADO_DA_WHITELIST>',
  LOG_FINAL: '<ID_DO_CANAL_DE_LOGS_FINAIS>',
  TICKET_STAFF: '<ID_DO_CANAL_DE_TICKETS_DA_EQUIPE>',
  STAFF_RECRUIT: '<ID_DO_CANAL_DE_RECRUTAMENTO_DA_STAFF>',
  FORM_STAFF: '<ID_DO_CANAL_ONDE_FICA_O_FORMULARIO_DA_STAFF>'
},
ROLES: {
  CIDADAO: '<ID_DO_CARGO_PADRAO_DO_USUARIO_APOS_WHITELIST>'
},
URLS: {
  SITE: '<URL_DO_SITE_DO_SERVIDOR>',
  RETRY_WL: '<LINK_DO_CANAL_OU_MENSAGEM_PARA_REFACAO_DA_WHITELIST>'
},
SERVER_LOGO: '<URL_DA_LOGO_DO_SERVIDOR>'

```

---

## 🛡️ Permissões Recomendadas

Para que todas as funções de **Whitelist** e **Cargos** funcionem, certifique-se de que o bot tenha a permissão de **Administrador** no servidor ou, no mínimo:

* Gerenciar Cargos
* Gerenciar Canais
* Enviar Mensagens e Ver Canais

```
