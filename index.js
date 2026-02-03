import {
  Client, GatewayIntentBits, Partials, Events, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ActivityType
} from 'discord.js';

/* ================= CONFIGURAÇÃO GLOBAL ================= */
const CONFIG = {
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

  COLORS: {
    SUCCESS: 0x2ECC71,
    ERROR: 0xE74C3C,
    PROCESS: 0x3498DB,
    PENDING: 0xF1C40F
  },

  URLS: {
    SITE: '<URL_DO_SITE_DO_SERVIDOR>',
    RETRY_WL: '<LINK_DO_CANAL_OU_MENSAGEM_PARA_REFACAO_DA_WHITELIST>'
  },

  SERVER_LOGO: '<URL_DA_LOGO_DO_SERVIDOR>'
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const wlCache = new Map();
const ticketCache = new Map();

/* ================= FUNÇÕES AUXILIARES ================= */
const createBaseEmbed = (title, description, color) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: 'Sua Cidade • By Santz', iconURL: CONFIG.SERVER_LOGO });
};

/* ================= EVENTO READY ================= */
client.on(Events.ClientReady, async () => {
  console.log(`🚀 Sistema 100% Online: ${client.user.tag}`);
  client.user.setActivity('Sua Cidade', { type: ActivityType.Streaming, url: 'https://twitch.tv/uniquerp' });
});

/* ================= COMANDOS DE SETUP ================= */
client.on(Events.MessageCreate, async (message) => {
  if (!message.member?.permissions.has('Administrator')) return;

  // Setup Whitelist
  if (message.content === '!setupwl') {
    const embed = new EmbedBuilder() 
        .setTitle('📝 FORMULÁRIO DE WHITELIST')
        .setColor(0x00FF00) // Ou CONFIG.COLORS.PROCESS
        .setAuthor({ 
            name: 'Sua cidade - Sistema de Admissão', 
            iconURL: CONFIG.SERVER_LOGO 
        })
        .setThumbnail(CONFIG.SERVER_LOGO)
        .setDescription(
            'Seja bem-vindo(a)! Para ingressar na **Sua cidade**, você precisa completar nosso formulário de integração.\n\n' +
            'Este processo serve para avaliar seu conhecimento sobre as regras básicas de Roleplay.'
        )
        .addFields(
            { name: '📖 Como funciona?', value: 'Ao clicar no botão, um formulário será aberto. Responda todas as perguntas com atenção.', inline: false },
            { name: '⚠️ Atenção', value: 'Respostas incompletas ou mal formatadas podem resultar em reprovação automática.', inline: false },
            { name: '⏱️ Resultado', value: 'Sua resposta será analisada pela nossa equipe em breve.', inline: true }
        )
        .setFooter({ text: 'Sua cidade • Leia as regras antes de começar', iconURL: CONFIG.SERVER_LOGO })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wl_start')
            .setLabel('Iniciar Perguntas')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✍️')
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
}

  if (message.content === '!whitelist-dm' && message.member.permissions.has('Administrator')) {
    await enviarAnuncioComBotao(message);
  }

  // Setup Ticket
  if (message.content === '!setupticket') {
    // 1. Primeiro criamos a base e guardamos na variável
    const embed = createBaseEmbed(
        '🎫 CENTRAL DE ATENDIMENTO', 
        'Precisa de ajuda? Nossa equipe está à disposição.', 
        CONFIG.COLORS.PROCESS
    );

    // 2. Agora adicionamos as melhorias linha por linha (sem encadear direto na função)
    embed.setAuthor({ name: 'Suporte Sua cidade', iconURL: CONFIG.SERVER_LOGO });
    embed.setThumbnail(CONFIG.SERVER_LOGO);
    
    // Adicionando campos extras de informação
    embed.addFields(
        { name: '⚠️ Importante', value: 'Sua **DM** deve estar aberta para o bot te chamar.', inline: false },
        { name: '⏰ Horário', value: 'Resposta conforme disponibilidade da Staff.', inline: true }
    );

    embed.setFooter({ text: 'Sua cidade • Clique abaixo para iniciar', iconURL: CONFIG.SERVER_LOGO });
    embed.setTimestamp();

    // 3. Criamos o botão
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_ticket_dm')
            .setLabel('Abrir Ticket no Privado')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📩')
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
}
});

/* ================= INTERAÇÕES (BOTÕES E MODAIS) ================= */
client.on(Events.InteractionCreate, async i => {
  
// --- INICIAR WHITELIST ---
if (i.isButton() && i.customId === 'wl_start') {
  try {
    const perguntas = [
      'Nome completo:', 
      'Idade:', 
      'Nome do personagem:', 
      'História do personagem:', 
      'O que é PG?', 
      'O que é MG?'
    ];
    const respostas = [];

    // Tenta enviar a primeira mensagem antes de confirmar para garantir que a DM está aberta
    await i.user.send({ embeds: [createBaseEmbed('📝 Início da Whitelist', 'Responda as perguntas abaixo. Você tem 5 minutos para cada uma.', CONFIG.COLORS.PROCESS)] });
    await i.reply({ content: '✅ O formulário foi enviado na sua DM!', ephemeral: true });

    for (const p of perguntas) {
      await i.user.send({ embeds: [createBaseEmbed('📝 Pergunta', `**${p}**`, CONFIG.COLORS.PROCESS)] });
      
      const filter = m => m.author.id === i.user.id;
      const collected = await i.user.dmChannel.awaitMessages({ filter, max: 1, time: 300000 });

      if (!collected.size) {
        return await i.user.send("⚠️ Tempo esgotado! O formulário foi cancelado.");
      }
      respostas.push(collected.first().content);
    }

    // Salva no cache
    wlCache.set(i.user.id, respostas);

    // Envio para o Canal da Staff
    const staffChan = await client.channels.fetch(CONFIG.CHANNELS.WL_STAFF);
    
    const staffEmbed = createBaseEmbed('📥 Nova Whitelist', `Candidato: <@${i.user.id}> (\`${i.user.id}\`)`, CONFIG.COLORS.PENDING)
      .addFields(
        { name: '👤 Identidade (Nome/Idade)', value: `${respostas[0]} - ${respostas[1]} anos`, inline: false },
        { name: '🎭 Personagem', value: respostas[2], inline: false },
        { name: '📖 História', value: respostas[3].substring(0, 1024), inline: false }, // Limite de caracteres do Discord
        { name: '🧠 Conhecimento (PG/MG)', value: `**PG:** ${respostas[4]}\n**MG:** ${respostas[5]}`, inline: false }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`wl_aprovar_${i.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`wl_reprovar_${i.user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
    );

    await staffChan.send({ embeds: [staffEmbed], components: [row] });
    await i.user.send("✅ Suas respostas foram enviadas para análise! Aguarde o resultado.");

  } catch (e) {
    console.error(e);
    await i.reply({ content: '❌ Não consegui te enviar DM! Verifique se suas mensagens diretas estão liberadas nas configurações de privacidade do servidor.', ephemeral: true });
  }
}

  // --- APROVAR WL ---
  if (i.isButton() && i.customId.startsWith('wl_aprovar_')) {
    const userId = i.customId.split('_')[2];
    const data = wlCache.get(userId);
    try {
      const member = await i.guild.members.fetch(userId);
      await member.roles.add(CONFIG.ROLES.CIDADAO);
      if (data) await member.setNickname(data[2]).catch(() => {});

      const dmEmbed = createBaseEmbed('🎉 APROVADO!', 'Sua whitelist foi aceita! Bem-vindo ao Sua cidade.', CONFIG.COLORS.SUCCESS);
      const rowSite = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Acessar Site').setURL(CONFIG.URLS.SITE).setStyle(ButtonStyle.Link).setEmoji('🌐'));
      
      await member.send({ embeds: [dmEmbed], components: [rowSite] }).catch(() => {});
      await client.channels.cache.get(CONFIG.CHANNELS.WL_RESULT).send(`✅ <@${userId}> aprovado!`);
      await i.update({ content: '✅ Aprovado!', components: [] });
    } catch (e) { i.reply('Erro ao aprovar.'); }
  }

  // --- REPROVAR WL (MODAL) ---
  if (i.isButton() && i.customId.startsWith('wl_reprovar_')) {
    const userId = i.customId.split('_')[2];
    const modal = new ModalBuilder().setCustomId(`wl_motivo_${userId}`).setTitle('Motivo da Reprovação')
      .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
    await i.showModal(modal);
  }

  if (i.isModalSubmit() && i.customId.startsWith('wl_motivo_')) {
    const userId = i.customId.split('_')[2];
    const motivo = i.fields.getTextInputValue('motivo');
    const user = await client.users.fetch(userId);
    
    const dmEmbed = createBaseEmbed('❌ REPROVADO', `Infelizmente você não passou.\n**Motivo:** ${motivo}`, CONFIG.COLORS.ERROR);
    const rowRetry = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Tentar Novamente').setURL(CONFIG.URLS.RETRY_WL).setStyle(ButtonStyle.Link).setEmoji('🔄'));
    
    await user.send({ embeds: [dmEmbed], components: [rowRetry] }).catch(() => {});
    await client.channels.cache.get(CONFIG.CHANNELS.WL_RESULT).send(`❌ <@${userId}> reprovado por: ${motivo}`);
    await i.reply({ content: 'Reprovado!', ephemeral: true });
  }

  // --- TICKET: ABRIR MODAL ---
  if (i.isButton() && i.customId === 'open_ticket_dm') {
    const modal = new ModalBuilder().setCustomId('modal_ticket').setTitle('Novo Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('assunto').setLabel('Assunto:').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relato').setLabel('Relato:').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
    await i.showModal(modal);
  }

  if (i.isModalSubmit() && i.customId === 'modal_ticket') {
    const assunto = i.fields.getTextInputValue('assunto');
    const relato = i.fields.getTextInputValue('relato');
    ticketCache.set(i.user.id, { active: true });
    
    const staffChan = await client.channels.fetch(CONFIG.CHANNELS.TICKET_STAFF);
    const staffEmbed = createBaseEmbed('📩 NOVO TICKET', `De: <@${i.user.id}>`, CONFIG.COLORS.PENDING)
      .addFields({ name: '📌 Assunto', value: assunto }, { name: '📝 Relato', value: relato });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tk_res_${i.user.id}`).setLabel('Responder').setStyle(ButtonStyle.Primary).setEmoji('💬'),
      new ButtonBuilder().setCustomId(`tk_close_${i.user.id}`).setLabel('Fechar').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );

    await staffChan.send({ content: `🔔 Novo ticket de ${i.user}`, embeds: [staffEmbed], components: [row] });
    await i.user.send({ embeds: [createBaseEmbed('🎫 TICKET ABERTO', 'Aguarde o retorno da Staff aqui.', CONFIG.COLORS.SUCCESS)] });
    await i.reply({ content: 'Ticket aberto na DM!', ephemeral: true });
  }

  // --- TICKET: RESPONDER (STAFF) ---
  if (i.isButton() && i.customId.startsWith('tk_res_')) {
    const userId = i.customId.split('_')[2];
    const modal = new ModalBuilder().setCustomId(`tk_modal_res_${userId}`).setTitle('Responder ao Player')
      .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel('Mensagem:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
    await i.showModal(modal);
  }

  if (i.isModalSubmit() && i.customId.startsWith('tk_modal_res_')) {
    const userId = i.customId.split('_')[3];
    const txt = i.fields.getTextInputValue('txt');
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [new EmbedBuilder().setTitle('🛡️ RESPOSTA STAFF').setDescription(txt).setColor(CONFIG.COLORS.SUCCESS)] });
    await i.reply({ content: 'Enviado!', ephemeral: true });
  }

  // --- TICKET: FECHAR ---
  if (i.isButton() && i.customId.startsWith('tk_close_')) {
    const userId = i.customId.split('_')[2];
    ticketCache.delete(userId);
    const user = await client.users.fetch(userId);
    await user.send({ embeds: [createBaseEmbed('🎫 ENCERRADO', 'Atendimento finalizado.', CONFIG.COLORS.ERROR)] }).catch(() => {});
    await i.reply({ content: 'Ticket fechado!', ephemeral: true });
  }
});

/* ================= PONTE DE MENSAGENS TICKET ================= */
client.on(Events.MessageCreate, async (m) => {
  if (m.author.bot || m.guild) return; // Só DM
  if (ticketCache.has(m.author.id)) {
    const staffChan = await client.channels.fetch(CONFIG.CHANNELS.TICKET_STAFF);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tk_res_${m.author.id}`).setLabel('Responder').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`tk_close_${m.author.id}`).setLabel('Fechar').setStyle(ButtonStyle.Danger)
    );
    await staffChan.send({ content: `💬 **DM de ${m.author.tag}:**\n${m.content}`, components: [row] });
    await m.react('✅');
  }
});

//* ================= CONFIGURAÇÃO DE PERGUNTAS ================= */
const perguntasRecrutamento = [
  // 5 PESSOAIS / DISPONIBILIDADE
  "1. Qual seu nome completo e idade?",
  "2. Qual sua ocupação atual (trabalha/estuda) e quanto tempo dedica ao PC?",
  "3. Qual seu horário disponível (manhã, tarde, noite, madrugada)?",
  "4. Você possui microfone de boa qualidade e sabe usar o Discord/TeamSpeak?",
  "5. Por que você deseja entrar para a Staff do Sua cidade e não de outro servidor?",

  // 5 REGRAS
  "6. Explique detalhadamente o que é VDM e RDM.",
  "7. O que é Combat Logging e por que é uma falta grave?",
  "8. Defina 'Amor à Vida' (Fear RP) em uma situação de assalto.",
  "9. O que você entende por MetaGaming (MG)? Dê um exemplo.",
  "10. O que é PowerGaming (PG) e como ele afeta o equilíbrio do RP?",

  // 5 SITUAÇÕES COTIDIANAS
  "11. Um amigo seu quebra uma regra na sua frente. Como você agiria?",
  "12. Um jogador começa a te xingar e desrespeitar durante um suporte. O que você faz?",
  "13. Você recebe uma denúncia de um player, mas ele não tem provas em vídeo. Como proceder?",
  "14. Você presencia um grupo de jogadores 'trollando' na praça principal. Qual sua conduta?",
  "15. Um player VIP alega que não pode ser banido por ter doado. Como você responde?",

  // 5 CONDUTA
  "16. Se um superior seu tomar uma decisão errada, como você o abordaria?",
  "17. O que você faria se precisasse punir um membro da sua própria organização?",
  "18. Você está em uma ação de RP importante e surge um ticket de urgência. Qual sua prioridade?",
  "19. Você aceita que críticas sobre seu trabalho serão constantes e devem ser tratadas com maturidade?",
  "20. Você está disposto a abdicar de parte do seu tempo de jogo para ajudar a comunidade?"
];

/* ================= COMANDO DE SETUP ================= */
client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!setupstaff' && message.member?.permissions.has('Administrator')) {
    const embed = createBaseEmbed(
      '🛡️ RECRUTAMENTO UNIQUE ROLEPLAY',
      'Deseja fazer parte da nossa equipe? O processo é composto por 20 perguntas enviadas em sua DM.\n\n**Categorias:**\n- Pessoal & Disponibilidade\n- Conhecimento de Regras\n- Situações de Jogo\n- Conduta & Ética',
      CONFIG.COLORS.PROCESS
    ).setThumbnail(CONFIG.SERVER_LOGO);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_staff_apply')
        .setLabel('Iniciar Inscrição')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
  }
});

/* ================= LÓGICA DA ENTREVISTA ================= */
client.on(Events.InteractionCreate, async i => {
  if (i.isButton() && i.customId === 'start_staff_apply') {
    try {
      await i.reply({ content: '✅ O questionário foi iniciado na sua **DM**!', ephemeral: true });
      
      const respostas = [];
      const user = i.user;

      for (let index = 0; index < perguntasRecrutamento.length; index++) {
        const qEmbed = createBaseEmbed(`Pergunta ${index + 1} de 20`, `**${perguntasRecrutamento[index]}**`, CONFIG.COLORS.PROCESS);
        await user.send({ embeds: [qEmbed] });

        const filter = m => m.author.id === user.id;
        const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 600000 }); // 10 min por pergunta

        if (!collected.size) {
          return user.send('❌ **Tempo esgotado!** Sua inscrição foi cancelada por inatividade.');
        }
        respostas.push(collected.first().content);
      }

      // --- ENVIO PARA A STAFF (3 EMBEDS PARA ORGANIZAÇÃO) ---
      const logChan = await client.channels.fetch(CONFIG.CHANNELS.FORM_STAFF); // Ou seu canal de logs de staff

      const embed1 = createBaseEmbed('📥 NOVA FICHA (1/3) - Pessoal', `Candidato: ${user}`, CONFIG.COLORS.PENDING)
        .addFields(
          { name: '1. Nome/Idade', value: respostas[0] },
          { name: '2. Ocupação', value: respostas[1] },
          { name: '3. Horários', value: respostas[2] },
          { name: '4. Equipamento', value: respostas[3] },
          { name: '5. Motivação', value: respostas[4] }
        );

      const embed2 = createBaseEmbed('📥 NOVA FICHA (2/3) - Regras e Situações', `Candidato: ${user}`, CONFIG.COLORS.PENDING)
        .addFields(
          { name: 'Regras (6-10)', value: `**6:** ${respostas[5]}\n**7:** ${respostas[6]}\n**8:** ${respostas[7]}\n**9:** ${respostas[8]}\n**10:** ${respostas[9]}` },
          { name: 'Situações (11-15)', value: `**11:** ${respostas[10]}\n**12:** ${respostas[11]}\n**13:** ${respostas[12]}\n**14:** ${respostas[13]}\n**15:** ${respostas[14]}` }
        );

      const embed3 = createBaseEmbed('📥 NOVA FICHA (3/3) - Conduta', `Candidato: ${user}`, CONFIG.COLORS.PENDING)
        .addFields(
          { name: 'Conduta (16-20)', value: `**16:** ${respostas[15]}\n**17:** ${respostas[16]}\n**18:** ${respostas[17]}\n**19:** ${respostas[18]}\n**20:** ${respostas[19]}` }
        );

      const rowAcao = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`staff_aprovar_${user.id}`).setLabel('Aprovar Candidato').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`staff_reprovar_${user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
      );

      await logChan.send({ content: `🔔 **Nova ficha de Staff: ${user.tag}**`, embeds: [embed1, embed2, embed3], components: [rowAcao] });
      await user.send('✅ **Inscrição concluída!** Suas respostas foram enviadas para a coordenação.');
      
      // Ativa cache para conversa via DM
      ticketCache.set(user.id, { active: true });

    } catch (e) {
      await i.followUp({ content: '❌ Sua DM está fechada! Não pude enviar as perguntas.', ephemeral: true });
    }
  }

  /* ================= AÇÕES DA STAFF (APROVAR/REPROVAR) ================= */
  if (i.isButton() && i.customId.startsWith('staff_aprovar_')) {
    const userId = i.customId.split('_')[2];
    const user = await client.users.fetch(userId);
    const okEmbed = createBaseEmbed('🛡️ RECRUTAMENTO Sua cidade', 'Parabéns! Sua ficha foi **APROVADA**. Em breve um coordenador entrará em contato aqui para a entrevista final.', CONFIG.COLORS.SUCCESS);
    await user.send({ embeds: [okEmbed] }).catch(() => {});
    await i.reply({ content: `✅ Candidato <@${userId}> aprovado para fase final.`, ephemeral: true });
  }

  if (i.isButton() && i.customId.startsWith('staff_reprovar_')) {
    const userId = i.customId.split('_')[2];
    const user = await client.users.fetch(userId);
    const noEmbed = createBaseEmbed('🛡️ RECRUTAMENTO Sua cidade', 'Infelizmente sua ficha foi **REPROVADA**. Agradecemos seu interesse.', CONFIG.COLORS.ERROR);
    await user.send({ embeds: [noEmbed] }).catch(() => {});
    ticketCache.delete(userId);
    await i.reply({ content: `❌ Candidato <@${userId}> reprovado.`, ephemeral: true });
  }
});

/* ================= SYSTEM: ANTI-CRASH PROFISSIONAL ================= */

// Captura erros de Promessas Rejeitadas (Ex: Erro ao enviar DM)
process.on('unhandledRejection', (reason, promise) => {
  console.log('⚠️ [ANTI-CRASH] Erro detectado (unhandledRejection):');
  console.error(reason);
});

// Captura exceções não tratadas (Ex: Variável inexistente)
process.on('uncaughtException', (err, origin) => {
  console.log('⚠️ [ANTI-CRASH] Erro detectado (uncaughtException):');
  console.error(err);
});

// Captura erros de monitoramento de processos
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log('⚠️ [ANTI-CRASH] Monitoramento de erro (uncaughtExceptionMonitor):');
  console.error(err);
});

async function enviarAnuncioComBotao(message) {
  // 1. Definições iniciais
  const members = await message.guild.members.fetch();
  const totalMembros = members.filter(m => !m.user.bot).size;
  const delayTime = 5000; // Alterado para 5 segundos

  // 2. Construção do Embed (Melhorado com sua logo)
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🚀 O SERVIDOR ATUALIZOU!')
    .setAuthor({ 
        name: message.guild.name, 
        iconURL: CONFIG.SERVER_LOGO 
    })
    .setThumbnail(CONFIG.SERVER_LOGO)
    .setDescription(
        'Nossa cidade acabou de passar por uma grande atualização! Venha conferir as novidades, novas mecânicas e oportunidades.'
    )
    .addFields(
        { 
            name: '📋 O que fazer?', 
            value: 'Faça sua **whitelist** agora mesmo para garantir seu acesso e ver de perto o que mudou!', 
            inline: false 
        },
        { 
            name: '🏢 Oportunidades', 
            value: 'Várias organizações estão disponíveis e vagas em empregos legais aguardam por você.', 
            inline: false 
        }
    )
    .setFooter({ 
        text: `Sua cidade • O início da sua jornada`, 
        iconURL: CONFIG.SERVER_LOGO 
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('wl_start')
        .setLabel('Fazer Whitelist')
        .setStyle(ButtonStyle.Success)
        .setEmoji('📝')
  );

  // 3. Envio no canal onde o comando foi digitado
  await message.channel.send({ embeds: [embed], components: [row] });
  message.delete().catch(() => {});

  // 4. Feedback inicial no console
  console.log(`🚀 Iniciando envio em massa para ${totalMembros} membros...`);
  message.channel.send(`📡 **Broadcast iniciado:** Enviando para ${totalMembros} pessoas com intervalo de ${delayTime / 1000}s.`);

  let enviados = 0;
  let falhas = 0;

  // 5. Loop com Delay Real (Async/Await)
  for (const [id, member] of members) {
      if (member.user.bot) continue;

      try {
          await member.send({ embeds: [embed], components: [row] });
          enviados++;
          console.log(`[${enviados}/${totalMembros}] ✅ DM enviada: ${member.user.tag}`);
      } catch (err) {
          falhas++;
          console.log(`[ERRO] ❌ DM fechada ou bloqueada: ${member.user.tag}`);
      }

      // Esta linha faz o código "dormir" antes de ir para o próximo membro do loop
      await new Promise(resolve => setTimeout(resolve, delayTime));
  }

  // 6. Finalização
  console.log(`🏁 Broadcast finalizado. Sucesso: ${enviados} | Falhas: ${falhas}`);
  message.channel.send(`🏁 **Broadcast finalizado!**\n✅ Sucesso: ${enviados}\n❌ Falhas (DM fechada): ${falhas}`);
}


//client.login("SEU_TOKEN_AQUI");

client.login("TOKEN-DO-BOT");

