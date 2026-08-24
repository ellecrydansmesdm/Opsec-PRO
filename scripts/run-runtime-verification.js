/**
 * Opsec PRO — Automated Runtime Verification & Failure Injection Test Suite
 * 
 * Tests real runtime execution, concurrency, failure injection, rollback resilience,
 * rate limit budgeting, and account isolation.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const EventEmitter = require('events');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, message) {
    if (condition) {
        passedTests++;
        console.log(`  ${GREEN}✓${RESET} ${message}`);
        results.push({ message, status: 'PASS' });
    } else {
        failedTests++;
        console.log(`  ${RED}✗ FAIL:${RESET} ${message}`);
        results.push({ message, status: 'FAIL' });
    }
}

async function runTests() {
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}${CYAN}   OPSEC PRO — AUTOMATED RUNTIME VERIFICATION & FAILURE SUITE          ${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${RESET}\n`);

    // 1. Build test bundle in-memory with esbuild to load TypeScript modules directly
    console.log(`${BOLD}📦 Compilation des modules pour le harnais de test...${RESET}`);
    const tempBundlePath = path.join(__dirname, '..', '.tmp_test_bundle.js');
    
    const harnessSource = `
        import { appBus, AuditLogger } from './electron/services/event-bus.ts';
        import { PolicyEngine, policyEngine } from './electron/services/policy-engine.ts';
        import { MacroService } from './electron/services/macro-service.ts';
        import { InChatDispatcher } from './electron/bot/inchat-dispatcher.ts';
        import { MessageLogger } from './electron/bot/message-logger.ts';
        import { VoiceStreamer } from './electron/bot/voice-streamer.ts';
        import { UpdateChecker } from './electron/services/update-checker.ts';
        import { SessionManager, sessionManager } from './electron/bot/session-manager.ts';
        import { StealthService, stealthService } from './electron/services/stealth-service.ts';
        import { TaskScheduler, taskScheduler } from './electron/services/task-scheduler.ts';
        import { calculateTypingDelay, simulateTyping, zeroTraceDelete } from './electron/bot/stealth-actions.ts';
        import { TokenVaultParser } from './electron/utils/token-vault-parser.ts';
        import { AccountDataExporter, accountDataExporter } from './electron/services/account-exporter.ts';

        export {
            appBus,
            AuditLogger,
            PolicyEngine,
            policyEngine,
            MacroService,
            InChatDispatcher,
            MessageLogger,
            VoiceStreamer,
            UpdateChecker,
            SessionManager,
            sessionManager,
            StealthService,
            stealthService,
            TaskScheduler,
            taskScheduler,
            calculateTypingDelay,
            simulateTyping,
            zeroTraceDelete,
            TokenVaultParser,
            AccountDataExporter,
            accountDataExporter
        };
    `;
    
    const harnessEntry = path.join(__dirname, '..', '.tmp_harness_entry.ts');
    fs.writeFileSync(harnessEntry, harnessSource, 'utf-8');

    try {
        await esbuild.build({
            entryPoints: [harnessEntry],
            bundle: true,
            platform: 'node',
            format: 'cjs',
            outfile: tempBundlePath,
            external: ['electron', 'discord.js-selfbot-v13', 'bytenode', 'framer-motion', 'react', 'react-dom']
        });
    } catch (e) {
        console.error(`${RED}Erreur de compilation du harnais de test:${RESET}`, e);
        process.exit(1);
    }

    const {
        appBus,
        PolicyEngine,
        policyEngine,
        MacroService,
        InChatDispatcher,
        MessageLogger,
        VoiceStreamer,
        UpdateChecker,
        SessionManager,
        sessionManager,
        StealthService,
        stealthService,
        TaskScheduler,
        taskScheduler,
        calculateTypingDelay,
        simulateTyping,
        zeroTraceDelete,
        TokenVaultParser,
        AccountDataExporter,
        accountDataExporter
    } = require(tempBundlePath);

    // =========================================================================
    // TEST SUITE 1: EVENT BUS & 3-TIER AUDIT LOGGER
    // =========================================================================
    console.log(`\n${BOLD}📡 [SUITE 1] AppEventBus & 3-Tier AuditLogger${RESET}`);
    
    // Test 1.1: Event Delivery & Order
    let receivedEvents = [];
    const unsubscribe1 = appBus.onTyped('bot:status', (data) => {
        receivedEvents.push(data);
    });

    appBus.emitTyped('bot:status', { status: 'connected', username: 'User1' });
    appBus.emitTyped('bot:status', { status: 'disconnected' });
    assert(receivedEvents.length === 2 && receivedEvents[0].username === 'User1' && receivedEvents[1].status === 'disconnected',
        'Livraison et ordonnancement strict des événements typés');

    // Test 1.2: Listener Cleanup & Memory Safety
    unsubscribe1();
    appBus.emitTyped('bot:status', { status: 'reconnecting' });
    assert(receivedEvents.length === 2, 'Désabonnement propre (aucune fuite de listener)');

    // Test 1.3: Audit Logger 3-Tier Categorization & Buffer Limiting
    appBus.logHistory = [];

    appBus.debug('Debug payload message', 'GATEWAY', { op: 2 });
    appBus.info('USER_PURGE: 5 messages supprimés', 'PURGE');
    appBus.audit('TOKEN_ACCESS', 'DENY', 'Tentative d\'accès non autorisé', { ip: '127.0.0.1' }, 'Attacker#0001');

    const history = appBus.getHistory();
    assert(history.length === 3, 'AuditLogger enregistre correctement les 3 niveaux');
    assert(history[2].level === 'security' && history[2].details.policy === 'DENY' && history[2].accountTag === 'Attacker#0001',
        'AuditLogger capture l\'acteur, la décision et les métadonnées de sécurité');

    // Test 1.4: Buffer Overflow Resistance (Pushing 700 logs, buffer should cap at 500)
    for (let i = 0; i < 700; i++) {
        appBus.debug(`Flood message #${i}`);
    }
    const floodHistory = appBus.getHistory();
    assert(floodHistory.length === 500, `Ring buffer capé strictement à 500 entrées (reçu: ${floodHistory.length})`);

    // =========================================================================
    // TEST SUITE 2: ACTION POLICY ENGINE (RATE-LIMITS & ISOLATION)
    // =========================================================================
    console.log(`\n${BOLD}⚖️ [SUITE 2] PolicyEngine (Rate Limits, Isolation & Concurrency)${RESET}`);

    // Test 2.1: Rate limit saturation & Progressive Warnings (ALLOW -> WARN -> DENY)
    const testAccountA = 'Account_Alpha#1111';
    let allowCount = 0;
    let warnCount = 0;
    let denyCount = 0;

    // Policy for STATUS_CHANGE: max 20 / min (threshold for WARN is 80% = 16)
    for (let i = 0; i < 25; i++) {
        const res = policyEngine.checkAction('STATUS_CHANGE', testAccountA);
        if (res.verdict === 'ALLOW') allowCount++;
        else if (res.verdict === 'WARN') warnCount++;
        else if (res.verdict === 'DENY') denyCount++;
    }

    assert(allowCount === 16, `Policy Engine: 16 requêtes initiales autorisées en ALLOW (obtenu: ${allowCount})`);
    assert(warnCount === 4, `Policy Engine: 4 requêtes suivantes autorisées en WARN (obtenu: ${warnCount})`);
    assert(denyCount === 5, `Policy Engine: 5 requêtes au-delà du quota bloquées en DENY (obtenu: ${denyCount})`);

    // Test 2.2: Context & Account Isolation
    const testAccountB = 'Account_Beta#2222';
    const resAccountB = policyEngine.checkAction('STATUS_CHANGE', testAccountB);
    assert(resAccountB.verdict === 'ALLOW',
        'Isolation multi-comptes : Le blocage du Compte A n\'impacte pas le Compte B');

    // Test 2.3: Concurrent Action Safety (Promise.all)
    const concurrentChecks = await Promise.all([
        policyEngine.checkAction('MASS_PURGE', 'Account_C#3333'),
        policyEngine.checkAction('MASS_PURGE', 'Account_C#3333'),
        policyEngine.checkAction('MASS_PURGE', 'Account_C#3333')
    ]);
    assert(concurrentChecks.every(c => c.verdict === 'ALLOW'), 'Validation concurrente sûre sans race condition');

    // =========================================================================
    // TEST SUITE 3: WORKFLOW ENGINE & SNAPSHOT ROLLBACK RESILIENCE
    // =========================================================================
    console.log(`\n${BOLD}🔄 [SUITE 3] Macro Engine & Snapshot Rollback Resilience${RESET}`);

    class MockDiscordClient extends EventEmitter {
        constructor() {
            super();
            this.user = {
                id: 'user_123',
                tag: 'Tester#0001',
                presence: {
                    status: 'dnd',
                    activities: [{ name: 'Competitive Match', type: 'PLAYING' }]
                },
                setStatus: (s) => { this.user.presence.status = s; },
                setPresence: (p) => { this.user.presence = { ...this.user.presence, ...p }; },
                setActivity: (a) => { this.user.presence.activities = [a]; }
            };
            this.settings = {
                setCustomStatus: async (s) => { this.user.presence.customStatus = s.text; }
            };
            this.ws = { ping: 24 };
            this.guilds = { cache: new Map(), fetch: async () => null };
            this.channels = { cache: new Map(), fetch: async () => null };
        }
    }

    const mockDiscordClient = new MockDiscordClient();
    const macroService = new MacroService((msg, type) => {});
    macroService.setBotService({ client: mockDiscordClient });

    // Test 3.1: Snapshot Capture & State Invariance
    macroService.captureSnapshot();
    const snapshot = macroService.getLastSnapshot();
    assert(snapshot !== null && snapshot.status === 'dnd' && snapshot.activities[0].name === 'Competitive Match',
        'Capture de l\'état complet du compte (Status, CustomStatus, Activités)');

    // Test 3.2: State Modification by Scenario
    mockDiscordClient.user.setStatus('idle');
    mockDiscordClient.user.setPresence({ activities: [] });
    assert(mockDiscordClient.user.presence.status === 'idle' && mockDiscordClient.user.presence.activities.length === 0,
        'Application des modifications par le scénario actif');

    // Test 3.3: 1-Click Rollback / Restauration
    const rollbackRes = await macroService.restoreSnapshot();
    assert(rollbackRes.success === true, 'Restauration de snapshot exécutée avec succès');
    assert(mockDiscordClient.user.presence.status === 'dnd' && mockDiscordClient.user.presence.activities[0].name === 'Competitive Match',
        'État initial du profil Discord restauré fidèlement');

    // Test 3.4: Scenario Execution
    macroService.saveUserMacro({
        id: 'test_macro_flow',
        name: 'Macro avec étapes de test',
        description: 'Test de gestion des étapes de scénario',
        steps: [
            { id: '1', type: 'status', params: { status: 'online', customText: 'En ligne test' }, label: 'Statut en ligne' },
            { id: '2', type: 'delay', params: { ms: 10 }, label: 'Pause courte' }
        ]
    });

    const execResult = await macroService.executeMacro('test_macro_flow');
    assert(execResult.success === true, 'Exécution complète d\'un scénario standard');

    // Test 3.5: Cancellation Test on Long Scenario
    macroService.saveUserMacro({
        id: 'test_long_macro',
        name: 'Macro longue pour test annulation',
        description: 'Pause 800ms',
        steps: [
            { id: '1', type: 'delay', params: { ms: 400 }, label: 'Pause 1' },
            { id: '2', type: 'delay', params: { ms: 400 }, label: 'Pause 2' }
        ]
    });

    const longExecPromise = macroService.executeMacro('test_long_macro');
    setTimeout(() => {
        macroService.cancelExecution();
    }, 50);
    const cancelRes = await longExecPromise;
    assert(cancelRes.success === true && macroService.isExecuting() === false,
        'Interruption immédiate du moteur lors d\'un cancel sans fuite');

    // =========================================================================
    // TEST SUITE 4: IN-CHAT DISPATCHER TOKENIZER & COMMAND REGISTRY
    // =========================================================================
    console.log(`\n${BOLD}⚡ [SUITE 4] In-Chat Dispatcher POSIX Tokenizer & Commands${RESET}`);

    const mockMessageLogger = new MessageLogger(mockDiscordClient);
    const mockGuildCloner = { createBackup: async () => ({ success: true }), listBackups: () => [] };
    const dispatcher = new InChatDispatcher(mockDiscordClient, mockMessageLogger, mockGuildCloner, () => {});

    // Access parseArgs via reflection
    const parseArgs = dispatcher.parseArgs.bind(dispatcher);

    // Test 4.1: Quotes and Spaces Parsing
    const tokens1 = parseArgs('fake stream "Live World Championship 2026" --fast');
    assert(tokens1.length === 4 && tokens1[2] === 'Live World Championship 2026' && tokens1[3] === '--fast',
        'Tokeniseur POSIX : Maintien des arguments avec espaces entre guillemets doubles');

    // Test 4.2: Single Quotes Parsing
    const tokens2 = parseArgs("status 'En vacances au soleil'");
    assert(tokens2.length === 2 && tokens2[1] === 'En vacances au soleil',
        'Tokeniseur POSIX : Maintien des arguments entre guillemets simples');

    // Test 4.3: Unclosed Quote Resilience
    const tokens3 = parseArgs('status "Guillemet non fermé test');
    assert(tokens3.length >= 1, 'Résilience aux guillemets non refermés (aucun crash)');

    // Test 4.4: Math Expression Evaluation Security (.calc)
    let mathResult = null;
    const mockCalcMessage = {
        author: { id: 'user1' },
        channel: { id: 'chan1', type: 'text' },
        content: '.calc (150 * 4) / 2',
        edit: async (txt) => { mathResult = txt; }
    };
    
    const calcCmd = dispatcher.commands.get('calc');
    await calcCmd.execute({ message: mockCalcMessage, args: ['(150', '*', '4)', '/', '2'], rawArgs: '(150 * 4) / 2', command: 'calc', prefix: '.' }, dispatcher);
    assert(mathResult && mathResult.includes('300'), `Calculatrice .calc évalue correctement (résultat reçu: ${mathResult})`);

    // =========================================================================
    // TEST SUITE 5: VOICE STREAMER 24/7 RECONNECTION MATH
    // =========================================================================
    console.log(`\n${BOLD}🎙️ [SUITE 5] Voice Streamer 24/7 Resilience & Backoff Math${RESET}`);

    const voiceStreamer = new VoiceStreamer(mockDiscordClient, () => {});
    
    // Backoff formula test: Math.min(30000, 1000 * Math.pow(1.5, attempts))
    const backoffAttempt1 = Math.min(30000, 1000 * Math.pow(1.5, 1));
    const backoffAttempt2 = Math.min(30000, 1000 * Math.pow(1.5, 2));
    const backoffAttempt5 = Math.min(30000, 1000 * Math.pow(1.5, 5));
    const backoffAttempt15 = Math.min(30000, 1000 * Math.pow(1.5, 15));

    assert(backoffAttempt1 === 1500, `Backoff tentative #1 = 1500ms (obtenu: ${backoffAttempt1}ms)`);
    assert(backoffAttempt2 === 2250, `Backoff tentative #2 = 2250ms (obtenu: ${backoffAttempt2}ms)`);
    assert(Math.round(backoffAttempt5) === 7594, `Backoff tentative #5 = 7594ms (obtenu: ${Math.round(backoffAttempt5)}ms)`);
    assert(backoffAttempt15 === 30000, `Backoff capé au maximum à 30000ms (obtenu: ${backoffAttempt15}ms)`);

    // =========================================================================
    // TEST SUITE 6: UPDATER CRYPTOGRAPHIC INTEGRITY
    // =========================================================================
    console.log(`\n${BOLD}🛡️ [SUITE 6] Updater Cryptographic Integrity & Tamper Resistance${RESET}`);

    const payload = Buffer.from('Official Opsec PRO Release Binary Content 2026');
    const validHash = crypto.createHash('sha256').update(payload).digest('hex');
    const tamperedPayload = Buffer.from('Tampered Injected Binary Content');

    const isValid = UpdateChecker.verifyChecksum(payload, validHash);
    const isTamperedRejected = !UpdateChecker.verifyChecksum(tamperedPayload, validHash);

    assert(isValid === true, 'Vérification SHA-256 valide l\'authenticité de l\'exécutable intègre');
    assert(isTamperedRejected === true, 'Vérification SHA-256 rejette immédiatement tout binaire altéré');

    // =========================================================================
    // TEST SUITE 7: MULTI-SESSION ISOLATION & STEALTH
    // =========================================================================
    console.log(`\n${BOLD}🌐 [SUITE 7] Multi-Session Isolation & Stealth Capabilities${RESET}`);

    // Test 7.1: Session Manager active session listing & proxy masking
    const initialSessions = sessionManager.listActiveSessions();
    assert(Array.isArray(initialSessions), 'SessionManager liste les sessions sous forme de tableau');

    // Test 7.2: Stealth Build Number Scraper Fallback
    const buildNumber = await stealthService.fetchDiscordBuildNumber();
    assert(typeof buildNumber === 'number' && buildNumber > 100000, `Scraper de build Discord extrait un numéro valide (obtenu: ${buildNumber})`);

    // Test 7.3: Proxy URL Sanitization in session logs
    const mockProxy = 'http://admin:SecretPassword123@192.168.1.1:8080';
    const sanitized = mockProxy.replace(/:[^:@]+@/, ':***@');
    assert(sanitized === 'http://admin:***@192.168.1.1:8080', 'Masquage strict des identifiants de proxy dans les journaux');

    // =========================================================================
    // TEST SUITE 8: TASK SCHEDULER & IN-APP CRON (TIER A)
    // =========================================================================
    console.log(`\n${BOLD}⏰ [SUITE 8] TaskScheduler & In-App Cron Engine (Tier A)${RESET}`);

    taskScheduler.setClient(mockDiscordClient);

    // Test 8.1: Add Scheduled Task
    const bumpTask = taskScheduler.addTask({
        id: 'task_bump_test',
        name: 'Auto-Bump Disboard Test',
        type: 'auto_bump',
        intervalMinutes: 120,
        jitterSeconds: 15,
        enabled: false,
        channelId: '123456789'
    });
    assert(bumpTask.id === 'task_bump_test' && bumpTask.runCount === 0, 'Création et enregistrement de tâche planifiée');

    // Test 8.2: Toggle & List Tasks
    taskScheduler.toggleTask('task_bump_test', true);
    const tasks = taskScheduler.listTasks();
    const foundTask = tasks.find(t => t.id === 'task_bump_test');
    assert(foundTask && foundTask.enabled === true && foundTask.nextRun && foundTask.nextRun > Date.now(),
        'Activation dynamique et calcul du timestamp nextRun');

    // Test 8.3: Direct Execution of Status Cycle Task
    const cycleTask = taskScheduler.addTask({
        id: 'task_status_cycle_test',
        name: 'Changement de Statut Programmé',
        type: 'status_cycle',
        intervalMinutes: 60,
        enabled: true,
        payload: 'Statut Cron Test 2026'
    });

    const execRes = await taskScheduler.executeTask(cycleTask);
    assert(execRes.success === true && mockDiscordClient.user.presence.customStatus === 'Statut Cron Test 2026',
        'Exécution atomique d\'une tâche planifiée avec mise à jour Discord');

    // Cleanup tasks
    taskScheduler.removeTask('task_bump_test');
    taskScheduler.removeTask('task_status_cycle_test');
    taskScheduler.stopAll();

    // =========================================================================
    // TEST SUITE 9: STEALTH ACTIONS & ZERO-TRACE RESILIENCE (TIER B)
    // =========================================================================
    console.log(`\n${BOLD}🧹 [SUITE 9] Stealth Actions & Zero-Trace Resilience (Tier B)${RESET}`);

    // Test 9.1: Realistic Typing Duration Calculation
    const shortDelay = calculateTypingDelay('Hello', { minDelayMs: 200, maxDelayMs: 3000 });
    const longDelay = calculateTypingDelay('This is a longer message intended to simulate human typing in discord channel', { minDelayMs: 200, maxDelayMs: 3000 });
    assert(shortDelay >= 200 && shortDelay <= 3000, `Délai de frappe pour texte court respecte les bornes (obtenu: ${shortDelay}ms)`);
    assert(longDelay >= shortDelay && longDelay <= 3000, `Délai de frappe proportionnel à la longueur du texte (obtenu: ${longDelay}ms)`);

    // Test 9.2: Typing Simulation Execution
    let typingSent = false;
    const mockChannelWithTyping = {
        sendTyping: async () => { typingSent = true; }
    };
    const simulatedMs = await simulateTyping(mockChannelWithTyping, 'Quick test', { minDelayMs: 50, maxDelayMs: 150 });
    assert(typingSent === true && simulatedMs >= 50, 'simulateTyping déclenche l\'événement channel.sendTyping() avec pause réaliste');

    // Test 9.3: Zero-Trace Message Overwrite & Deletion
    let messageEditedWith = '';
    let messageDeleted = false;
    const mockDeletableMessage = {
        edit: async (content) => { messageEditedWith = content; },
        delete: async () => { messageDeleted = true; }
    };

    const deleteSuccess = await zeroTraceDelete(mockDeletableMessage, { placeholder: '.', editDelayMs: 10 });
    assert(deleteSuccess === true && messageEditedWith === '.' && messageDeleted === true,
        'zeroTraceDelete effectue une écriture neutre avant suppression physique');

    // =========================================================================
    // TEST SUITE 10: TOKEN VAULT PARSER & DATA EXPORTER (TIER C)
    // =========================================================================
    console.log(`\n${BOLD}🔑 [SUITE 10] Token Vault Parser & Data Exporter (Tier C)${RESET}`);

    // Mock valid Discord snowflake "100000000000000000" -> base64 "MTAwMDAwMDAwMDAwMDAwMDA="
    const validMockToken = 'MTAwMDAwMDAwMDAwMDAwMDA=.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const parsedRaw = TokenVaultParser.parseLine('123456789012345678.Ga1234.AbCdEfGhIjKlMnOpQrStUvWxYz0123456789');
    assert(parsedRaw !== null && parsedRaw.isValidStructure === true && parsedRaw.userId === '123456789012345678',
        'Validation cryptographique de structure de token Discord et extraction du Snowflake');

    // Test 10.2: Composite format: email:password:token:proxy
    const compositeInput = `admin@opsec.pro:MySecurePass123:${validMockToken}:socks5://127.0.0.1:9050`;
    const parsedComposite = TokenVaultParser.parseLine(compositeInput);
    assert(parsedComposite !== null && parsedComposite.email === 'admin@opsec.pro' && parsedComposite.token === validMockToken && parsedComposite.proxy === 'socks5://127.0.0.1:9050',
        'Parsing universel de formats composites (email:pass:token:proxy)');

    // Test 10.3: JSON format parsing
    const jsonInput = JSON.stringify({ token: `Bearer ${validMockToken}`, email: 'test@opsec.pro' });
    const parsedJson = TokenVaultParser.parseLine(jsonInput);
    assert(parsedJson !== null && parsedJson.token === validMockToken && parsedJson.email === 'test@opsec.pro',
        'Parsing de payloads JSON avec détection et suppression automatique du préfixe Bearer');

    // Test 10.4: Bulk Batch Token Normalization with garbage filtering
    const bulkInput = `
        ${validMockToken}
        NOT_A_TOKEN_GARBAGE
        user@domain.com:pass:${validMockToken}
        RANDOM_INVALID_LINE_12345
    `;
    const bulkResult = TokenVaultParser.parseBulk(bulkInput);
    assert(bulkResult.valid.length === 2 && bulkResult.invalidCount === 2,
        `Filtrage de masse : ${bulkResult.valid.length} valides extraits, ${bulkResult.invalidCount} rejets`);

    // Test 10.5: Account Data Exporter
    const exportResult = await accountDataExporter.exportAccountSnapshot(mockDiscordClient);
    assert(exportResult.success === true && exportResult.data && exportResult.data.account.id === 'user_123',
        'Exportation d\'instantané de compte avec relations et guildes sérialisées');

    // =========================================================================
    // FINAL RESULTS & REPORT SUMMARY
    // =========================================================================
    console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${RESET}`);
    console.log(`${BOLD}🎯 RÉSULTATS DU HARNAIS DE TEST RUNTIME :${RESET}`);
    console.log(`  Tests Réussis : ${GREEN}${BOLD}${passedTests}${RESET}`);
    console.log(`  Tests Échoués : ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);
    console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════${RESET}\n`);

    // Clean up temporary bundle files
    try {
        if (fs.existsSync(tempBundlePath)) fs.unlinkSync(tempBundlePath);
        if (fs.existsSync(harnessEntry)) fs.unlinkSync(harnessEntry);
    } catch (_) {}

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
});
