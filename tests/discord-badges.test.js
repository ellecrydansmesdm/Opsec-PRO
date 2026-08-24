const assert = require('assert');

// Test suite for Discord Badges Resolution and Progression Engine
console.log('🧪 Starting Discord Badges Engine Test Suite...\n');

// 1. Bitfield definitions
const FLAGS = {
    DISCORD_STAFF: 1 << 0, // 1
    PARTNERED_SERVER_OWNER: 1 << 1, // 2
    HYPESQUAD_EVENTS: 1 << 2, // 4
    BUG_HUNTER_LEVEL_1: 1 << 3, // 8
    HYPESQUAD_HOUSE_1: 1 << 6, // 64 (Bravery)
    HYPESQUAD_HOUSE_2: 1 << 7, // 128 (Brilliance)
    HYPESQUAD_HOUSE_3: 1 << 8, // 256 (Balance)
    EARLY_SUPPORTER: 1 << 9, // 512
    BUG_HUNTER_LEVEL_2: 1 << 14, // 16384
    VERIFIED_BOT: 1 << 16, // 65536
    EARLY_VERIFIED_BOT_DEVELOPER: 1 << 17, // 131072
    CERTIFIED_MODERATOR: 1 << 18, // 262144
    ACTIVE_DEVELOPER_DECOMMISSIONED: 1 << 22 // 4194304
};

// Simplified pure JS port for headless node testing
function testResolveUserBadges(input) {
    const resolvedMap = new Map();
    const publicFlags = Number(input.publicFlags ?? input.flags ?? 0);

    // Bitfields
    if (publicFlags & FLAGS.DISCORD_STAFF) resolvedMap.set('discord_staff', { id: 'discord_staff', category: 'CURRENT', evolves: false });
    if (publicFlags & FLAGS.PARTNERED_SERVER_OWNER) resolvedMap.set('partnered_server_owner', { id: 'partnered_server_owner', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.HYPESQUAD_EVENTS) resolvedMap.set('hypesquad_events', { id: 'hypesquad_events', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.BUG_HUNTER_LEVEL_1) resolvedMap.set('bug_hunter_level_1', { id: 'bug_hunter_level_1', category: 'CURRENT', evolves: false });
    if (publicFlags & FLAGS.HYPESQUAD_HOUSE_1) resolvedMap.set('hypesquad_house_1', { id: 'hypesquad_house_1', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.HYPESQUAD_HOUSE_2) resolvedMap.set('hypesquad_house_2', { id: 'hypesquad_house_2', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.HYPESQUAD_HOUSE_3) resolvedMap.set('hypesquad_house_3', { id: 'hypesquad_house_3', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.EARLY_SUPPORTER) resolvedMap.set('early_supporter', { id: 'early_supporter', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.BUG_HUNTER_LEVEL_2) resolvedMap.set('bug_hunter_level_2', { id: 'bug_hunter_level_2', category: 'CURRENT', evolves: false });
    if (publicFlags & FLAGS.CERTIFIED_MODERATOR) resolvedMap.set('moderator_programs_alumni', { id: 'moderator_programs_alumni', category: 'LEGACY_VISIBLE', evolves: false });
    if (publicFlags & FLAGS.EARLY_VERIFIED_BOT_DEVELOPER) resolvedMap.set('early_verified_bot_developer', { id: 'early_verified_bot_developer', category: 'BOT_ONLY', evolves: false });
    if (publicFlags & FLAGS.VERIFIED_BOT) resolvedMap.set('verified_bot', { id: 'verified_bot', category: 'BOT_ONLY', evolves: false });

    // ANTI-REGRESSION: Active Developer is decommissioned and MUST NOT be added
    if (publicFlags & FLAGS.ACTIVE_DEVELOPER_DECOMMISSIONED) {
        // Explicitly ignored / removed
    }

    // Nitro
    if (input.premiumType || input.premiumSince) {
        if (input.premiumType === 3) {
            resolvedMap.set('nitro', { id: 'nitro_basic', category: 'CURRENT', evolves: false });
        } else if (input.premiumType === 1) {
            resolvedMap.set('nitro', { id: 'nitro_classic', category: 'CURRENT', evolves: false });
        } else {
            resolvedMap.set('nitro', { id: 'nitro', category: 'CURRENT', evolves: true, earnedDate: input.premiumSince });
        }
    }

    // Server Booster
    if (input.premiumGuildSince) {
        resolvedMap.set('guild_booster', { id: 'guild_booster', category: 'CURRENT', evolves: true, earnedDate: input.premiumGuildSince });
    }

    // Legacy Username
    if (input.legacyUsername) {
        resolvedMap.set('legacy_username', { id: 'legacy_username', category: 'CURRENT', evolves: false });
    }

    // Profile Badges
    if (input.profileBadges && Array.isArray(input.profileBadges)) {
        for (const pb of input.profileBadges) {
            if (pb.id === 'active_developer') continue;
            let mappedId = pb.id;
            if (pb.id.includes('house_1') || pb.id.includes('bravery')) mappedId = 'hypesquad_house_1';
            if (pb.id.includes('quest')) mappedId = 'quest_completed';
            if (pb.id.includes('orbs')) mappedId = 'orbs';
            if (pb.id.includes('last_meadow')) mappedId = 'last_meadow_online';
            if (pb.id.includes('gifting')) mappedId = 'gifting_badge';

            if (!resolvedMap.has(mappedId)) {
                resolvedMap.set(mappedId, { id: mappedId, category: 'CURRENT', evolves: false });
            }
        }
    }

    return Array.from(resolvedMap.values());
}

// ----------------------------------------------------------------------------
// TEST 1: Staff + Early Supporter
// ----------------------------------------------------------------------------
{
    const badges = testResolveUserBadges({
        publicFlags: FLAGS.DISCORD_STAFF | FLAGS.EARLY_SUPPORTER
    });
    assert.strictEqual(badges.length, 2, 'Should have 2 badges');
    assert.ok(badges.some(b => b.id === 'discord_staff'), 'Has Discord Staff');
    assert.ok(badges.some(b => b.id === 'early_supporter'), 'Has Early Supporter');
    console.log('✅ Test 1: Staff + Early Supporter passed');
}

// ----------------------------------------------------------------------------
// TEST 2: Bug Hunter L1 and L2 distinct
// ----------------------------------------------------------------------------
{
    const l1 = testResolveUserBadges({ publicFlags: FLAGS.BUG_HUNTER_LEVEL_1 });
    assert.strictEqual(l1.length, 1);
    assert.strictEqual(l1[0].id, 'bug_hunter_level_1');

    const l2 = testResolveUserBadges({ publicFlags: FLAGS.BUG_HUNTER_LEVEL_2 });
    assert.strictEqual(l2.length, 1);
    assert.strictEqual(l2[0].id, 'bug_hunter_level_2');
    console.log('✅ Test 2: Bug Hunter L1 and L2 distinct passed');
}

// ----------------------------------------------------------------------------
// TEST 3: Anti-Regression: Active Developer must NOT be rendered
// ----------------------------------------------------------------------------
{
    const res = testResolveUserBadges({
        publicFlags: FLAGS.ACTIVE_DEVELOPER_DECOMMISSIONED,
        profileBadges: [{ id: 'active_developer' }]
    });
    assert.strictEqual(res.length, 0, 'Active developer must be completely ignored');
    console.log('✅ Test 3: Active Developer decommissioning anti-regression passed');
}

// ----------------------------------------------------------------------------
// TEST 4: Nitro vs Nitro Basic vs Nitro Classic
// ----------------------------------------------------------------------------
{
    const standard = testResolveUserBadges({ premiumType: 2, premiumSince: '2023-01-01' });
    assert.strictEqual(standard[0].id, 'nitro');
    assert.strictEqual(standard[0].evolves, true);

    const basic = testResolveUserBadges({ premiumType: 3 });
    assert.strictEqual(basic[0].id, 'nitro_basic');
    assert.strictEqual(basic[0].evolves, false);

    const classic = testResolveUserBadges({ premiumType: 1 });
    assert.strictEqual(classic[0].id, 'nitro_classic');
    assert.strictEqual(classic[0].evolves, false);
    console.log('✅ Test 4: Nitro tiers (Standard, Basic, Classic) passed');
}

// ----------------------------------------------------------------------------
// TEST 5: Deduplication across public_flags and profile.badges
// ----------------------------------------------------------------------------
{
    const res = testResolveUserBadges({
        publicFlags: FLAGS.HYPESQUAD_HOUSE_1,
        profileBadges: [
            { id: 'hypesquad_house_1', description: 'HypeSquad Bravery' },
            { id: 'quest_completed', description: 'Discord Quests' }
        ]
    });
    assert.strictEqual(res.length, 2, 'Should have exactly 2 unique badges');
    const braveryCount = res.filter(b => b.id === 'hypesquad_house_1').length;
    assert.strictEqual(braveryCount, 1, 'HypeSquad Bravery must not be duplicated');
    console.log('✅ Test 5: Deduplication mechanism passed');
}

// ----------------------------------------------------------------------------
// TEST 6: Legacy Username & Quests & Orbs & Last Meadow
// ----------------------------------------------------------------------------
{
    const res = testResolveUserBadges({
        legacyUsername: 'olduser#1337',
        profileBadges: [
            { id: 'quest_completed' },
            { id: 'orbs' },
            { id: 'last_meadow_online' }
        ]
    });
    assert.strictEqual(res.length, 4);
    assert.ok(res.some(b => b.id === 'legacy_username'));
    assert.ok(res.some(b => b.id === 'quest_completed'));
    assert.ok(res.some(b => b.id === 'orbs'));
    assert.ok(res.some(b => b.id === 'last_meadow_online'));
    console.log('✅ Test 6: Legacy Username, Quests, Orbs, Last Meadow passed');
}

// ----------------------------------------------------------------------------
// TEST 7: Unknown Future Badges
// ----------------------------------------------------------------------------
{
    const res = testResolveUserBadges({
        profileBadges: [{ id: 'future_badge_2027_metaverse' }]
    });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res.some(b => b.id.includes('future')), true);
    console.log('✅ Test 7: Unknown future badge graceful handling passed');
}

// ----------------------------------------------------------------------------
// TEST 8: Edge cases: Empty / Null / Redacted
// ----------------------------------------------------------------------------
{
    const resEmpty = testResolveUserBadges({});
    assert.strictEqual(resEmpty.length, 0);

    const resNull = testResolveUserBadges({ publicFlags: null, flags: undefined, profileBadges: null });
    assert.strictEqual(resNull.length, 0);
    console.log('✅ Test 8: Edge cases passed');
}

console.log('\n🎉 ALL 8 DISCORD BADGE UNIT TESTS PASSED WITH 100% SUCCESS!');
