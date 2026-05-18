/**
 * Comprehensive Agent Test Suite for AI Care Companion
 * Tests each agent + orchestrator multi-agent pipeline via Gemini API
 * Outputs: tests/results/suite-report.md
 *
 * Usage: node scripts/testAgents.mjs [--agent=id] [--quick]
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Parse .env
const env = {};
readFileSync(resolve(root, '.env'), 'utf-8').split('\n').forEach(l => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const API_KEY = env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not found'); process.exit(1); }

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = process.argv.includes('--quick') ? 'gemini-2.5-flash' : 'gemma-4-31b-it';
const ARGS = process.argv;

// ─── Load all agent prompts ───
const promptsDir = resolve(root, 'prompts');
const agentFiles = readdirSync(promptsDir).filter(f => f.endsWith('.yaml'));
const agents = agentFiles
  .map(f => {
    const raw = readFileSync(resolve(promptsDir, f), 'utf-8');
    const id = (raw.match(/^id:\s*(.+)/m) || [])[1]?.trim() || f.replace('.yaml','');
    const name = (raw.match(/^display_name:\s*(.+)/m) || [])[1]?.trim() || id;
    const sp = (raw.match(/^system_prompt:\s*\|\s*\n([\s\S]+?)(?:\n\w+:|$)/m) || [])[1]?.trim() || '';
    return { file: f, id, name, prompt: sp };
  })
  .filter(a => a.prompt && a.id !== 'orchestrator');

const orchestrator = (() => {
  try {
    const raw = readFileSync(resolve(promptsDir, 'orchestrator.yaml'), 'utf-8');
    return (raw.match(/^system_prompt:\s*\|\s*\n([\s\S]+?)(?:\n\w+:|$)/m) || [])[1]?.trim() || '';
  } catch { return ''; }
})();

// ─── Test queries per specialty ───
const TEST_QUERIES = {
  general_practice: 'I have had a headache and mild fever for 2 days. What should I do?',
  paediatrics: 'My 3-year-old has a cough and runny nose for 4 days. No fever. Should I be worried?',
  cardiology: 'I sometimes feel my heart racing and get dizzy. What could be causing this?',
  dermatology: 'I have a red itchy rash on my forearm that appeared yesterday. What could it be?',
  neurology: 'I get migraines about twice a month. What can help prevent them?',
  gastroenterology: 'I have bloating and stomach pain after eating. What dietary changes can help?',
  pulmonology: 'I get short of breath when climbing stairs. Is this normal?',
  endocrinology: 'I feel tired all the time and have gained weight. Could this be thyroid related?',
  psychiatry: 'I have been feeling anxious and unable to sleep properly for the past month.',
  nutrition_dietetics: 'What diet would you recommend for someone with high cholesterol?',
  emergency_medicine: 'What should I do if someone is having a severe allergic reaction?',
  pharmacy: 'Can I take ibuprofen with my blood pressure medication?',
  orthopaedics: 'I twisted my ankle playing sports. It is swollen. What should I do?',
  ophthalmology: 'My eyes feel dry and gritty all day. What can help?',
  dentistry: 'I have a toothache that comes and goes. What could it be?',
  radiology: 'What does an X-ray show for pneumonia vs normal lungs?',
  sleep_medicine: 'I have trouble falling asleep and wake up multiple times at night.',
  pain_management: 'I have chronic lower back pain that gets worse when sitting for long periods.',
  travel_medicine: 'I am traveling to a tropical country next month. What vaccines do I need?',
  geriatrics: 'My 72-year-old mother has been forgetting things more often. Should I be concerned?',
};

async function callGemini(systemPrompt, userMessage, temp = 0.7) {
  const res = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: temp, maxOutputTokens: 1024 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${data.error.code}: ${data.error.message}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '(empty response)';
}

// ─── Test orchestrator with multi-agent routing ───
async function testOrchestrator() {
  console.log('\n🧠 Testing Orchestrator (multi-agent routing)...');
  const query = 'I have chest pain that started suddenly while exercising. I also feel nauseous and my left arm feels heavy.';
  const start = Date.now();
  const response = await callGemini(orchestrator, query);
  const ms = Date.now() - start;
  console.log(`  ✅ Response in ${ms}ms`);
  return { query, response, latencyMs: ms };
}

// ─── Test individual agents ───
async function testAgent(agent) {
  const query = TEST_QUERIES[agent.id] || `What are the key things to know about ${agent.name}?`;
  console.log(`  📋 ${agent.name}...`);
  const start = Date.now();
  try {
    const response = await callGemini(agent.prompt, query);
    const ms = Date.now() - start;
    console.log(`    ✅ ${ms}ms`);
    return { id: agent.id, name: agent.name, query, response, latencyMs: ms, ok: true };
  } catch (e) {
    console.log(`    ❌ ${e.message}`);
    return { id: agent.id, name: agent.name, query, response: e.message, latencyMs: 0, ok: false };
  }
}

// ─── Main ───
async function main() {
  const resultsDir = resolve(root, 'tests', 'results');
  mkdirSync(resultsDir, { recursive: true });

  const specAgent = ARGS.find(a => a.startsWith('--agent='))?.split('=')[1];
  const testAll = !specAgent;

  console.log(`\n🔬 AI Care Companion — Agent Test Suite`);
  console.log(`Model: ${MODEL}`);
  console.log(`API Key: ${API_KEY.slice(0, 10)}...`);
  console.log(`Agents loaded: ${agents.length}`);
  console.log(`Test queries: ${Object.keys(TEST_QUERIES).length}`);
  console.log(`\n${'═'.repeat(60)}`);

  const results = [];
  const startAll = Date.now();

  // 1. Orchestrator test
  results.push({ type: 'orchestrator', ...await testOrchestrator() });

  // 2. Agent tests
  const toTest = testAll ? agents : agents.filter(a => a.id === specAgent);
  console.log(`\n⚕️  Testing ${toTest.length} agents...`);

  for (const agent of toTest) {
    const r = await testAgent(agent);
    results.push({ type: 'agent', ...r });
  }

  const totalMs = Date.now() - startAll;

  // ─── Generate markdown report ───
  const pass = results.filter(r => r.ok !== false).length;
  const fail = results.filter(r => r.ok === false).length;

  let md = `# AI Care Companion — Agent Test Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Model:** \`${MODEL}\`\n`;
  md += `**Total tests:** ${results.length}\n`;
  md += `**Passed:** ${pass} ✅ | **Failed:** ${fail} ❌\n`;
  md += `**Duration:** ${(totalMs / 1000).toFixed(1)}s\n\n`;
  md += `---\n\n`;

  // Orchestrator
  const orch = results.find(r => r.type === 'orchestrator');
  if (orch) {
    md += `## 🧠 Orchestrator (Multi-Agent Routing)\n\n`;
    md += `**Query:** ${orch.query}\n`;
    md += `**Latency:** ${orch.latencyMs}ms\n\n`;
    md += `**Response:**\n\n${orch.response}\n\n`;
    md += `---\n\n`;
  }

  // Agents by specialty
  md += `## ⚕️ Agent Tests\n\n`;
  md += `| # | Agent | Query | Latency | Status |\n`;
  md += `|---|-------|-------|---------|--------|\n`;
  results.filter(r => r.type === 'agent').forEach((r, i) => {
    const status = r.ok ? '✅' : '❌';
    const lat = r.latencyMs ? `${r.latencyMs}ms` : '—';
    const q = r.query?.slice(0, 60) + (r.query?.length > 60 ? '...' : '');
    md += `| ${i + 1} | ${r.name} | ${q} | ${lat} | ${status} |\n`;
  });

  md += `\n---\n\n`;

  // Detailed responses
  md += `## 📝 Detailed Responses\n\n`;
  results.filter(r => r.type === 'agent').forEach(r => {
    md += `### ${r.name} (\`${r.id}\`)\n\n`;
    md += `**Query:** ${r.query}\n\n`;
    md += `**Response:**\n\n${r.response}\n\n`;
    md += `**Latency:** ${r.latencyMs}ms | **Status:** ${r.ok ? '✅ Pass' : '❌ Failed'}\n\n`;
    md += `---\n\n`;
  });

  // Summary
  md += `## 📊 Performance Summary\n\n`;
  const latencies = results.filter(r => r.latencyMs).map(r => r.latencyMs);
  if (latencies.length > 0) {
    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    md += `- **Average latency:** ${avg}ms\n`;
    md += `- **Fastest:** ${min}ms\n`;
    md += `- **Slowest:** ${max}ms\n`;
  }
  md += `- **Agents tested:** ${results.filter(r => r.type === 'agent').length} / ${agents.length}\n`;
  md += `- **Success rate:** ${Math.round((pass / results.length) * 100)}%\n`;

  // Write report
  const reportPath = resolve(resultsDir, `suite-report-${Date.now()}.md`);
  const latestPath = resolve(resultsDir, 'suite-report.md');
  writeFileSync(reportPath, md);
  writeFileSync(latestPath, md);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📄 Report saved: ${reportPath}`);
  console.log(`📄 Latest: ${latestPath}`);
  console.log(`✅ ${pass} passed | ❌ ${fail} failed | ⏱ ${(totalMs / 1000).toFixed(1)}s total`);
}

main().catch(e => { console.error(e); process.exit(1); });
