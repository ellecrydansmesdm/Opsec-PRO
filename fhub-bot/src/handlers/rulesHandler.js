module.exports = async function handleRules(interaction) {
  const memberRoleId = process.env.MEMBER_ROLE_ID;

  if (!memberRoleId) {
    return interaction.reply({
      content: '⚠️ Le rôle Membre n’est pas configuré sur le bot. Veuillez contacter un administrateur.',
      ephemeral: true
    });
  }

  const member = interaction.member;

  if (member.roles.cache.has(memberRoleId)) {
    return interaction.reply({
      content: 'ℹ️ Vous avez déjà accepté le règlement et vous possédez déjà le rôle Membre.',
      ephemeral: true
    });
  }

  try {
    await member.roles.add(memberRoleId);
    await interaction.reply({
      content: '✅ **Règlement validé !** Bienvenue sur le serveur FHUB, vous avez désormais accès à l’ensemble des salons.',
      ephemeral: true
    });
  } catch (err) {
    console.error('[Rules] Erreur attribution rôle:', err);
    await interaction.reply({
      content: '❌ Impossible d’attribuer le rôle (vérifiez la hiérarchie des rôles du bot).',
      ephemeral: true
    });
  }
};
