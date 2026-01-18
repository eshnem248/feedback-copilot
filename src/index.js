// /**
//  * Feedback Copilot v4 - Feature Rich Edition
//  * 
//  * New Features:
//  * - Morning Briefing Mode
//  * - Trend Sparklines
//  * - Theme Clustering Map
//  * - Auto-Generated Action Items
//  * - Keyboard Shortcuts
//  * - Conversation History
//  * - Smart Export (Slack, Markdown, Jira)
//  */

// export default {
//   async fetch(request, env) {
//     const url = new URL(request.url);
    
//     if (url.pathname === '/api/analyze' && request.method === 'POST') {
//       return handleAnalyze(request, env);
//     }
//     if (url.pathname === '/api/briefing') {
//       return handleBriefing(env);
//     }
//     if (url.pathname === '/api/sources') {
//       return handleSources(env);
//     }
//     if (url.pathname === '/api/trends') {
//       return handleTrends(env);
//     }
//     if (url.pathname === '/api/init') {
//       return handleInit(env);
//     }
    
//     return new Response(renderHTML(), {
//       headers: { 'Content-Type': 'text/html' }
//     });
//   }
// };

// async function handleInit(env) {
//   try {
//     await env.DB.prepare('DROP TABLE IF EXISTS feedback').run();
    
//     await env.DB.prepare(`
//       CREATE TABLE feedback (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         source TEXT NOT NULL,
//         product_area TEXT,
//         content TEXT NOT NULL,
//         sentiment TEXT,
//         urgency TEXT DEFAULT 'normal',
//         created_at TEXT DEFAULT (datetime('now'))
//       )
//     `).run();
    
//     await env.DB.prepare('CREATE INDEX idx_feedback_source ON feedback(source)').run();
//     await env.DB.prepare('CREATE INDEX idx_feedback_created ON feedback(created_at)').run();
    
//     const mockData = getMockFeedback();
//     for (const item of mockData) {
//       await env.DB.prepare(
//         'INSERT INTO feedback (source, product_area, content, sentiment, urgency, created_at) VALUES (?, ?, ?, ?, ?, ?)'
//       ).bind(item.source, item.product_area, item.content, item.sentiment, item.urgency, item.created_at).run();
//     }
    
//     return Response.json({ success: true, message: `Initialized with ${mockData.length} feedback items` });
//   } catch (error) {
//     return Response.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// async function handleSources(env) {
//   try {
//     const results = await env.DB.prepare(`
//       SELECT source, COUNT(*) as count,
//         SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
//         SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
//         SUM(CASE WHEN urgency IN ('high', 'critical') THEN 1 ELSE 0 END) as urgent
//       FROM feedback GROUP BY source
//     `).all();
//     return Response.json(results.results || []);
//   } catch (error) {
//     return Response.json({ error: error.message }, { status: 500 });
//   }
// }

// async function handleTrends(env) {
//   try {
//     // Get theme trends over time (simulated with product areas)
//     const thisWeek = await env.DB.prepare(`
//       SELECT product_area, COUNT(*) as count, 
//         AVG(CASE WHEN sentiment = 'negative' THEN 1 WHEN sentiment = 'positive' THEN -1 ELSE 0 END) as severity
//       FROM feedback 
//       WHERE created_at >= datetime('now', '-7 days') AND product_area IS NOT NULL
//       GROUP BY product_area ORDER BY count DESC LIMIT 5
//     `).all();
    
//     const lastWeek = await env.DB.prepare(`
//       SELECT product_area, COUNT(*) as count
//       FROM feedback 
//       WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days') AND product_area IS NOT NULL
//       GROUP BY product_area
//     `).all();
    
//     // Calculate trend direction
//     const lastWeekMap = {};
//     (lastWeek.results || []).forEach(r => lastWeekMap[r.product_area] = r.count);
    
//     const trends = (thisWeek.results || []).map(r => ({
//       area: r.product_area,
//       count: r.count,
//       severity: r.severity,
//       lastWeek: lastWeekMap[r.product_area] || 0,
//       trend: r.count > (lastWeekMap[r.product_area] || 0) ? 'up' : 
//              r.count < (lastWeekMap[r.product_area] || 0) ? 'down' : 'flat'
//     }));
    
//     return Response.json({ trends });
//   } catch (error) {
//     return Response.json({ error: error.message }, { status: 500 });
//   }
// }

// // Morning Briefing - Automated daily summary
// async function handleBriefing(env) {
//   try {
//     const stats = await env.DB.prepare(`
//       SELECT 
//         COUNT(*) as total,
//         SUM(CASE WHEN created_at >= datetime('now', '-1 days') THEN 1 ELSE 0 END) as today,
//         SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
//         SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
//         SUM(CASE WHEN urgency IN ('high', 'critical') THEN 1 ELSE 0 END) as urgent
//       FROM feedback WHERE created_at >= datetime('now', '-7 days')
//     `).first();
    
//     const topIssues = await env.DB.prepare(`
//       SELECT product_area, COUNT(*) as count
//       FROM feedback 
//       WHERE sentiment = 'negative' AND created_at >= datetime('now', '-7 days')
//       GROUP BY product_area ORDER BY count DESC LIMIT 3
//     `).all();
    
//     const criticalItems = await env.DB.prepare(`
//       SELECT source, content FROM feedback 
//       WHERE urgency = 'critical' AND created_at >= datetime('now', '-3 days')
//       LIMIT 3
//     `).all();
    
//     const positiveWins = await env.DB.prepare(`
//       SELECT content FROM feedback 
//       WHERE sentiment = 'positive' AND created_at >= datetime('now', '-7 days')
//       ORDER BY RANDOM() LIMIT 2
//     `).all();
    
//     return Response.json({
//       stats,
//       topIssues: topIssues.results || [],
//       criticalItems: criticalItems.results || [],
//       positiveWins: positiveWins.results || []
//     });
//   } catch (error) {
//     return Response.json({ error: error.message }, { status: 500 });
//   }
// }

// async function handleAnalyze(request, env) {
//   try {
//     const { question, sources, includeActions, includeCluster } = await request.json();
    
//     if (!question) {
//       return Response.json({ error: 'Question is required' }, { status: 400 });
//     }
    
//     let query = 'SELECT * FROM feedback';
//     let params = [];
    
//     if (sources?.length > 0) {
//       query += ` WHERE source IN (${sources.map(() => '?').join(',')})`;
//       params = sources;
//     }
    
//     const stmt = env.DB.prepare(query);
//     const feedbackResults = sources?.length > 0 
//       ? await stmt.bind(...params).all() 
//       : await stmt.all();
    
//     const feedback = feedbackResults.results || [];
    
//     if (feedback.length === 0) {
//       return Response.json({
//         summary: 'No feedback found for the selected sources.',
//         themes: [], sentiment: {}, risks: [], evidence: [], 
//         actions: [], clusters: [], followups: []
//       });
//     }
    
//     const feedbackText = feedback.map((f, i) => 
//       `[${i + 1}] ${f.source} | ${f.product_area || 'general'} | ${f.sentiment} | ${f.urgency}\n"${f.content}"`
//     ).join('\n\n');
    
//     // Enhanced prompt with action items and clustering
//     const systemPrompt = `You are a product analyst. Analyze feedback and return JSON:

// {
//   "summary": "3-4 sentence executive summary",
//   "themes": [
//     {
//       "name": "Theme name",
//       "description": "One sentence",
//       "sentiment": "positive|negative|mixed",
//       "count": number,
//       "trend": "up|down|flat",
//       "trendData": [3, 5, 2, 7, 4, 6, 8]
//     }
//   ],
//   "sentiment": {
//     "overall": "positive|negative|neutral|mixed",
//     "positive": percent_number,
//     "negative": percent_number,
//     "explanation": "One sentence"
//   },
//   "risks": [
//     {"signal": "Risk description", "urgency": "critical|high|medium", "area": "product_area"}
//   ],
//   "evidence": [
//     {"quote": "Short quote", "source": "source_name"}
//   ],
//   "actions": [
//     {
//       "title": "Action item title",
//       "description": "What to do",
//       "priority": "P0|P1|P2",
//       "type": "bug|feature|docs|ops",
//       "effort": "small|medium|large"
//     }
//   ],
//   "clusters": [
//     {
//       "id": "cluster_id",
//       "name": "Cluster name",
//       "themes": ["theme1", "theme2"],
//       "size": number,
//       "x": 0-100,
//       "y": 0-100
//     }
//   ],
//   "followups": ["Question 1?", "Question 2?"]
// }

// Generate 2-3 actions, 2-3 clusters. Clusters should show related themes. trendData is 7 numbers representing last 7 days activity (higher = more mentions).`;

//     const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
//       messages: [
//         { role: 'system', content: systemPrompt },
//         { role: 'user', content: `Question: "${question}"\n\nFeedback (${feedback.length} items):\n\n${feedbackText}\n\nJSON:` }
//       ],
//       max_tokens: 2500
//     });
    
//     let analysis;
//     try {
//       const responseText = aiResponse.response || '';
//       const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//       analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
//       if (!analysis) throw new Error('No JSON');
//     } catch {
//       analysis = {
//         summary: aiResponse.response || 'Analysis could not be parsed',
//         themes: [], sentiment: { overall: 'mixed' }, risks: [],
//         evidence: [], actions: [], clusters: [], followups: []
//       };
//     }
    
//     analysis.meta = { 
//       count: feedback.length, 
//       sources: [...new Set(feedback.map(f => f.source))],
//       timestamp: new Date().toISOString()
//     };
    
//     return Response.json(analysis);
    
//   } catch (error) {
//     return Response.json({ error: error.message }, { status: 500 });
//   }
// }

// function getMockFeedback() {
//   const now = new Date();
//   const daysAgo = (days) => {
//     const d = new Date(now);
//     d.setDate(d.getDate() - days);
//     return d.toISOString().slice(0, 19).replace('T', ' ');
//   };
  
//   return [
//     { source: 'support', product_area: 'authentication', content: "SSO implementation is blocked - documentation doesn't match the current API version.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
//     { source: 'support', product_area: 'billing', content: "Love the new usage dashboard! Finally can see where our costs are going.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
//     { source: 'support', product_area: 'api', content: "Getting random 502 errors on /v2/analyze. Affects about 10% of our requests.", sentiment: 'negative', urgency: 'critical', created_at: daysAgo(0) },
//     { source: 'support', product_area: 'onboarding', content: "New developer got set up in 15 minutes. Quickstart guide is excellent.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(2) },
//     { source: 'support', product_area: 'pricing', content: "Pro to Enterprise jump is too steep for mid-size companies.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(1) },
//     { source: 'support', product_area: 'authentication', content: "MFA setup fails silently. No error message, just redirects back.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
//     { source: 'support', product_area: 'api', content: "Rate limits aren't clearly documented. Got throttled unexpectedly.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(3) },
//     { source: 'github', product_area: 'sdk', content: "Python SDK missing type hints. Would love to contribute a PR.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
//     { source: 'github', product_area: 'api', content: "Feature request: Add webhook support for real-time notifications.", sentiment: 'neutral', urgency: 'normal', created_at: daysAgo(4) },
//     { source: 'github', product_area: 'sdk', content: "Node.js SDK crashes when payload exceeds 10MB.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(1) },
//     { source: 'github', product_area: 'documentation', content: "API reference is great but missing common use case guides.", sentiment: 'mixed', urgency: 'low', created_at: daysAgo(5) },
//     { source: 'github', product_area: 'cli', content: "CLI doesn't respect .env files in subdirectories.", sentiment: 'negative', urgency: 'low', created_at: daysAgo(3) },
//     { source: 'github', product_area: 'sdk', content: "Java SDK hasn't been updated in 6 months. Missing new endpoints.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(2) },
//     { source: 'discord', product_area: 'general', content: "Just shipped my first project! The DX is incredible.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(0) },
//     { source: 'discord', product_area: 'onboarding', content: "Can't find where API keys moved to in the new dashboard.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(0) },
//     { source: 'discord', product_area: 'pricing', content: "Free tier is so generous I feel guilty not paying.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
//     { source: 'discord', product_area: 'api', content: "API seems slower today. 2-3x latency compared to yesterday.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
//     { source: 'discord', product_area: 'general', content: "Community is so helpful. Got my question answered in 5 minutes.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
//     { source: 'discord', product_area: 'documentation', content: "'Coming soon' page hasn't been updated in 8 months.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(2) },
//     { source: 'twitter', product_area: 'general', content: "Switched from competitor - build times dropped by 60%!", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
//     { source: 'twitter', product_area: 'pricing', content: "Love the product but pricing page is confusing.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
//     { source: 'twitter', product_area: 'api', content: "API down for 20 mins, production affected, no status update.", sentiment: 'negative', urgency: 'critical', created_at: daysAgo(0) },
//     { source: 'twitter', product_area: 'general', content: "Thread: Why I'm migrating all clients to this platform (1/12)", sentiment: 'positive', urgency: 'low', created_at: daysAgo(3) },
//     { source: 'twitter', product_area: 'onboarding', content: "Verification email never arrived. Tried 3 times. Giving up.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
//     { source: 'in_app', product_area: 'ui', content: "Dark mode is beautiful. Easy on the eyes for late nights.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
//     { source: 'in_app', product_area: 'performance', content: "Dashboard takes 8+ seconds to load with 50+ projects.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
//     { source: 'in_app', product_area: 'ui', content: "Please add keyboard shortcuts. Using this all day.", sentiment: 'neutral', urgency: 'normal', created_at: daysAgo(4) },
//     { source: 'in_app', product_area: 'billing', content: "Got double charged. Support fixed it but shouldn't happen.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
//     { source: 'in_app', product_area: 'api', content: "Rate limit errors don't say when I can retry.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(1) },
//     { source: 'in_app', product_area: 'performance', content: "Search is instant now. Whatever you did, thank you!", sentiment: 'positive', urgency: 'low', created_at: daysAgo(0) }
//   ];
// }

// function renderHTML() {
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Feedback Copilot</title>
//   <link rel="preconnect" href="https://fonts.googleapis.com">
//   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
//   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
//   <style>
//     * { margin: 0; padding: 0; box-sizing: border-box; }
    
//     :root {
//       --bg-gradient: linear-gradient(160deg, #dbeafe 0%, #ede9fe 50%, #fce7f3 100%);
//       --surface: #ffffff;
//       --surface-secondary: #f8fafc;
//       --text: #0f172a;
//       --text-secondary: #64748b;
//       --text-muted: #94a3b8;
//       --border: #e2e8f0;
//       --accent: #6366f1;
//       --accent-light: #eef2ff;
//       --positive: #10b981;
//       --positive-light: #d1fae5;
//       --negative: #ef4444;
//       --negative-light: #fee2e2;
//       --warning: #f59e0b;
//       --warning-light: #fef3c7;
//     }
    
//     body {
//       font-family: 'Inter', system-ui, sans-serif;
//       background: var(--bg-gradient);
//       background-attachment: fixed;
//       min-height: 100vh;
//       color: var(--text);
//       -webkit-font-smoothing: antialiased;
//     }
//     /* Thread List */
//     .threads-container {
//       background: var(--surface);
//       border-radius: 12px;
//       margin-bottom: 1rem;
//       overflow: hidden;
//       box-shadow: 0 1px 3px rgba(0,0,0,0.04);
//     }

//     .threads-header {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       padding: 0.75rem 1rem;
//       border-bottom: 1px solid var(--border);
//       cursor: pointer;
//     }

//     .threads-header:hover { background: var(--surface-secondary); }

//     .threads-title {
//       font-size: 0.75rem;
//       font-weight: 600;
//       color: var(--text-muted);
//       text-transform: uppercase;
//       letter-spacing: 0.05em;
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//     }

//     .thread-count {
//       background: var(--accent-light);
//       color: var(--accent);
//       font-size: 0.6875rem;
//       padding: 0.125rem 0.375rem;
//       border-radius: 4px;
//     }

//     .threads-toggle {
//       width: 20px;
//       height: 20px;
//       color: var(--text-muted);
//       transition: transform 0.2s;
//     }

//     .threads-container.collapsed .threads-toggle { transform: rotate(-90deg); }
//     .threads-container.collapsed .threads-list { display: none; }

//     .threads-list {
//       max-height: 200px;
//       overflow-y: auto;
//     }

//     .thread-item {
//       display: flex;
//       align-items: center;
//       gap: 0.75rem;
//       padding: 0.75rem 1rem;
//       cursor: pointer;
//       transition: background 0.15s;
//       border-bottom: 1px solid var(--border);
//     }

//     .thread-item:last-child { border-bottom: none; }
//     .thread-item:hover { background: var(--surface-secondary); }
//     .thread-item.active { background: var(--accent-light); }

//     .thread-dot {
//       width: 8px;
//       height: 8px;
//       border-radius: 50%;
//       background: var(--text-muted);
//       flex-shrink: 0;
//     }

//     .thread-item.active .thread-dot { background: var(--accent); }

//     .thread-info { flex: 1; min-width: 0; }

//     .thread-name {
//       font-size: 0.875rem;
//       font-weight: 500;
//       color: var(--text);
//       white-space: nowrap;
//       overflow: hidden;
//       text-overflow: ellipsis;
//     }

//     .thread-meta {
//       font-size: 0.6875rem;
//       color: var(--text-muted);
//       margin-top: 0.125rem;
//     }

//     .thread-delete {
//       width: 24px;
//       height: 24px;
//       border-radius: 6px;
//       border: none;
//       background: transparent;
//       color: var(--text-muted);
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       opacity: 0;
//       transition: all 0.15s;
//     }

//     .thread-item:hover .thread-delete { opacity: 1; }
//     .thread-delete:hover { background: var(--negative-light); color: var(--negative); }

//     .new-thread-btn {
//       width: 100%;
//       padding: 0.75rem 1rem;
//       font-family: inherit;
//       font-size: 0.8125rem;
//       font-weight: 500;
//       color: var(--accent);
//       background: transparent;
//       border: none;
//       border-top: 1px solid var(--border);
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       gap: 0.5rem;
//       transition: background 0.15s;
//     }

//     .new-thread-btn:hover { background: var(--accent-light); }

//     .thread-indicator {
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//       padding: 0.5rem 1rem;
//       background: var(--accent-light);
//       font-size: 0.75rem;
//       color: var(--accent);
//     }

//     /* Thread Messages */
//     .thread-messages {
//       background: var(--surface);
//       border-radius: 12px;
//       margin-bottom: 1rem;
//       overflow: hidden;
//     }

//     .thread-messages-header {
//       padding: 0.75rem 1rem;
//       border-bottom: 1px solid var(--border);
//       font-size: 0.75rem;
//       font-weight: 600;
//       color: var(--text-muted);
//       text-transform: uppercase;
//       letter-spacing: 0.05em;
//     }

//     .message-item {
//       padding: 0.875rem 1rem;
//       border-bottom: 1px solid var(--border);
//     }

//     .message-item:last-child { border-bottom: none; }

//     .message-question {
//       font-size: 0.875rem;
//       font-weight: 500;
//       color: var(--accent);
//       margin-bottom: 0.375rem;
//     }

//     .message-answer {
//       font-size: 0.8125rem;
//       color: var(--text-secondary);
//       line-height: 1.5;
//       display: -webkit-box;
//       -webkit-line-clamp: 2;
//       -webkit-box-orient: vertical;
//       overflow: hidden;
//     }
    
//     .app {
//       max-width: 800px;
//       margin: 0 auto;
//       padding: 2rem 1.5rem;
//     }
    
//     /* Header */
//     .header {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       margin-bottom: 2rem;
//     }
    
//     .brand {
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//     }
    
//     .logo {
//       font-size: 1.125rem;
//       font-weight: 600;
//       color: var(--text);
//     }
    
//     .logo-icon {
//       color: var(--accent);
//     }
    
//     .header-actions {
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//     }
    
//     .icon-btn {
//       width: 36px;
//       height: 36px;
//       border-radius: 10px;
//       border: 1px solid var(--border);
//       background: var(--surface);
//       color: var(--text-secondary);
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       transition: all 0.15s;
//     }
    
//     .icon-btn:hover {
//       border-color: var(--text-secondary);
//       color: var(--text);
//     }
    
//     .icon-btn.active {
//       background: var(--accent);
//       border-color: var(--accent);
//       color: white;
//     }
    
//     .icon-btn svg { width: 18px; height: 18px; }
    
//     /* Keyboard hint */
//     .kbd {
//       font-size: 0.625rem;
//       font-family: inherit;
//       padding: 0.125rem 0.375rem;
//       background: var(--surface-secondary);
//       border: 1px solid var(--border);
//       border-radius: 4px;
//       color: var(--text-muted);
//     }
    
//     /* Command Box */
//     .command-box {
//       background: var(--surface);
//       border-radius: 16px;
//       box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.04);
//       margin-bottom: 1.5rem;
//       overflow: hidden;
//       transition: box-shadow 0.2s;
//     }
    
//     .command-box:focus-within {
//       box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99,102,241,0.12);
//     }
    
//     .input-row {
//       display: flex;
//       align-items: center;
//       padding: 0.5rem;
//     }
    
//     .command-input {
//       flex: 1;
//       padding: 0.875rem 1rem;
//       font-family: inherit;
//       font-size: 1rem;
//       border: none;
//       background: transparent;
//       color: var(--text);
//       outline: none;
//     }
    
//     .command-input::placeholder { color: var(--text-muted); }
    
//     .submit-btn {
//       width: 40px;
//       height: 40px;
//       border-radius: 10px;
//       border: none;
//       background: var(--text);
//       color: white;
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       transition: all 0.15s;
//     }
    
//     .submit-btn:hover { transform: scale(1.05); }
//     .submit-btn:disabled { opacity: 0.4; transform: none; }
//     .submit-btn svg { width: 18px; height: 18px; }
    
//     .sources-row {
//       display: flex;
//       align-items: center;
//       gap: 0.375rem;
//       padding: 0.625rem 1rem;
//       border-top: 1px solid var(--border);
//     }
    
//     .source-chip {
//       padding: 0.375rem 0.625rem;
//       font-size: 0.75rem;
//       font-weight: 500;
//       color: var(--text-muted);
//       background: transparent;
//       border: 1px solid var(--border);
//       border-radius: 6px;
//       cursor: pointer;
//       transition: all 0.15s;
//     }
    
//     .source-chip:hover { border-color: var(--text-secondary); }
    
//     .source-chip.active {
//       background: var(--accent-light);
//       border-color: transparent;
//       color: var(--accent);
//     }
    
//     /* Quick prompts */
//     .prompts {
//       display: flex;
//       flex-wrap: wrap;
//       gap: 0.5rem;
//       margin-bottom: 1.5rem;
//     }
    
//     .prompt-btn {
//       padding: 0.5rem 0.875rem;
//       font-family: inherit;
//       font-size: 0.8125rem;
//       color: var(--text-secondary);
//       background: rgba(255,255,255,0.7);
//       border: none;
//       border-radius: 8px;
//       cursor: pointer;
//       transition: all 0.15s;
//     }
    
//     .prompt-btn:hover { background: var(--surface); color: var(--text); }
    
//     /* Morning Briefing Modal */
//     .briefing-overlay {
//       position: fixed;
//       inset: 0;
//       background: rgba(0,0,0,0.4);
//       backdrop-filter: blur(4px);
//       display: none;
//       align-items: center;
//       justify-content: center;
//       z-index: 100;
//       padding: 1rem;
//     }
    
//     .briefing-overlay.visible { display: flex; }
    
//     .briefing-modal {
//       background: var(--surface);
//       border-radius: 20px;
//       width: 100%;
//       max-width: 500px;
//       max-height: 85vh;
//       overflow: auto;
//       animation: modalIn 0.2s ease;
//     }
    
//     @keyframes modalIn {
//       from { opacity: 0; transform: scale(0.95); }
//       to { opacity: 1; transform: scale(1); }
//     }
    
//     .briefing-header {
//       padding: 1.5rem;
//       border-bottom: 1px solid var(--border);
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//     }
    
//     .briefing-title {
//       font-size: 1rem;
//       font-weight: 600;
//     }
    
//     .briefing-date {
//       font-size: 0.75rem;
//       color: var(--text-muted);
//     }
    
//     .close-btn {
//       width: 32px;
//       height: 32px;
//       border-radius: 8px;
//       border: none;
//       background: var(--surface-secondary);
//       color: var(--text-secondary);
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }
    
//     .briefing-content { padding: 1.5rem; }
    
//     .briefing-section {
//       margin-bottom: 1.5rem;
//     }
    
//     .briefing-section:last-child { margin-bottom: 0; }
    
//     .briefing-section-title {
//       font-size: 0.6875rem;
//       font-weight: 600;
//       text-transform: uppercase;
//       letter-spacing: 0.05em;
//       color: var(--text-muted);
//       margin-bottom: 0.75rem;
//     }
    
//     .stat-grid {
//       display: grid;
//       grid-template-columns: repeat(3, 1fr);
//       gap: 0.75rem;
//     }
    
//     .stat-card {
//       background: var(--surface-secondary);
//       border-radius: 10px;
//       padding: 0.875rem;
//       text-align: center;
//     }
    
//     .stat-value {
//       font-size: 1.5rem;
//       font-weight: 600;
//       color: var(--text);
//     }
    
//     .stat-value.negative { color: var(--negative); }
//     .stat-value.positive { color: var(--positive); }
    
//     .stat-label {
//       font-size: 0.6875rem;
//       color: var(--text-muted);
//       margin-top: 0.25rem;
//     }
    
//     .issue-item {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       padding: 0.625rem 0;
//       border-bottom: 1px solid var(--border);
//     }
    
//     .issue-item:last-child { border-bottom: none; }
    
//     .issue-name {
//       font-size: 0.875rem;
//       color: var(--text);
//     }
    
//     .issue-count {
//       font-size: 0.75rem;
//       font-weight: 500;
//       color: var(--negative);
//       background: var(--negative-light);
//       padding: 0.25rem 0.5rem;
//       border-radius: 4px;
//     }
    
//     .critical-item {
//       background: var(--negative-light);
//       border-radius: 8px;
//       padding: 0.75rem;
//       margin-bottom: 0.5rem;
//       font-size: 0.8125rem;
//       color: var(--text);
//     }
    
//     .critical-item:last-child { margin-bottom: 0; }
    
//     .critical-source {
//       font-size: 0.6875rem;
//       color: var(--negative);
//       margin-top: 0.375rem;
//     }
    
//     .win-item {
//       background: var(--positive-light);
//       border-radius: 8px;
//       padding: 0.75rem;
//       margin-bottom: 0.5rem;
//       font-size: 0.8125rem;
//       color: var(--text);
//       font-style: italic;
//     }
    
//     .win-item:last-child { margin-bottom: 0; }
    
//     /* Results */
//     .results { display: none; }
//     .results.visible { display: block; }
    
//     /* Conversation History */
//     .history {
//       margin-bottom: 1rem;
//     }
    
//     .history-item {
//       background: var(--surface-secondary);
//       border-radius: 10px;
//       padding: 0.75rem 1rem;
//       margin-bottom: 0.5rem;
//       font-size: 0.8125rem;
//     }
    
//     .history-q {
//       color: var(--accent);
//       font-weight: 500;
//       margin-bottom: 0.25rem;
//     }
    
//     .history-a {
//       color: var(--text-secondary);
//       display: -webkit-box;
//       -webkit-line-clamp: 2;
//       -webkit-box-orient: vertical;
//       overflow: hidden;
//     }
    
//     /* Summary Card */
//     .summary-card {
//       background: var(--surface);
//       border-radius: 16px;
//       padding: 1.5rem;
//       margin-bottom: 1rem;
//       box-shadow: 0 1px 3px rgba(0,0,0,0.04);
//     }
    
//     .summary-text {
//       font-size: 1.0625rem;
//       line-height: 1.7;
//       color: var(--text);
//     }
    
//     .summary-meta {
//       margin-top: 1rem;
//       padding-top: 1rem;
//       border-top: 1px solid var(--border);
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       font-size: 0.75rem;
//       color: var(--text-muted);
//     }
    
//     .export-btns {
//       display: flex;
//       gap: 0.375rem;
//     }
    
//     .export-btn {
//       padding: 0.375rem 0.625rem;
//       font-family: inherit;
//       font-size: 0.6875rem;
//       font-weight: 500;
//       color: var(--text-muted);
//       background: transparent;
//       border: 1px solid var(--border);
//       border-radius: 6px;
//       cursor: pointer;
//       transition: all 0.15s;
//     }
    
//     .export-btn:hover {
//       color: var(--text);
//       border-color: var(--text-secondary);
//     }
    
//     /* Loading */
//     .loading {
//       text-align: center;
//       padding: 3rem;
//       color: var(--text-secondary);
//     }
    
//     .spinner {
//       width: 32px;
//       height: 32px;
//       border: 2px solid var(--border);
//       border-top-color: var(--accent);
//       border-radius: 50%;
//       animation: spin 0.7s linear infinite;
//       margin: 0 auto 1rem;
//     }
    
//     @keyframes spin { to { transform: rotate(360deg); } }
    
//     /* Sections */
//     .section {
//       background: var(--surface);
//       border-radius: 12px;
//       margin-bottom: 0.5rem;
//       overflow: hidden;
//     }
    
//     .section-header {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       padding: 1rem 1.25rem;
//       cursor: pointer;
//     }
    
//     .section-header:hover { background: rgba(0,0,0,0.01); }
    
//     .section-title {
//       font-size: 0.875rem;
//       font-weight: 500;
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//     }
    
//     .badge {
//       font-size: 0.6875rem;
//       font-weight: 500;
//       padding: 0.25rem 0.5rem;
//       border-radius: 4px;
//       background: var(--accent-light);
//       color: var(--accent);
//     }
    
//     .badge.warning {
//       background: var(--warning-light);
//       color: var(--warning);
//     }
    
//     .badge.negative {
//       background: var(--negative-light);
//       color: var(--negative);
//     }
    
//     .chevron {
//       width: 18px;
//       height: 18px;
//       color: var(--text-muted);
//       transition: transform 0.2s;
//     }
    
//     .section.open .chevron { transform: rotate(180deg); }
    
//     .section-content {
//       display: none;
//       padding: 0 1.25rem 1.25rem;
//     }
    
//     .section.open .section-content { display: block; }
    
//     /* Themes with Sparklines */
//     .theme-item {
//       padding: 0.875rem 0;
//       border-bottom: 1px solid var(--border);
//       display: flex;
//       align-items: flex-start;
//       justify-content: space-between;
//       gap: 1rem;
//     }
    
//     .theme-item:last-child { border-bottom: none; padding-bottom: 0; }
//     .theme-item:first-child { padding-top: 0; }
    
//     .theme-info { flex: 1; }
    
//     .theme-name {
//       font-size: 0.875rem;
//       font-weight: 500;
//       display: flex;
//       align-items: center;
//       gap: 0.5rem;
//     }
    
//     .trend-indicator {
//       font-size: 0.75rem;
//     }
    
//     .trend-indicator.up { color: var(--negative); }
//     .trend-indicator.down { color: var(--positive); }
//     .trend-indicator.flat { color: var(--text-muted); }
    
//     .theme-desc {
//       font-size: 0.8125rem;
//       color: var(--text-secondary);
//       margin-top: 0.25rem;
//     }
    
//     .sentiment-dot {
//       width: 6px;
//       height: 6px;
//       border-radius: 50%;
//       display: inline-block;
//       margin-right: 0.375rem;
//     }
    
//     .sentiment-dot.positive { background: var(--positive); }
//     .sentiment-dot.negative { background: var(--negative); }
//     .sentiment-dot.mixed { background: var(--warning); }
    
//     /* Sparkline */
//     .sparkline {
//       width: 60px;
//       height: 24px;
//       flex-shrink: 0;
//     }
    
//     .sparkline svg {
//       width: 100%;
//       height: 100%;
//     }
    
//     .sparkline path {
//       fill: none;
//       stroke: var(--accent);
//       stroke-width: 1.5;
//       stroke-linecap: round;
//       stroke-linejoin: round;
//     }
    
//     .sparkline.negative path { stroke: var(--negative); }
    
//     /* Theme Cluster Map */
//     .cluster-map {
//       position: relative;
//       width: 100%;
//       height: 200px;
//       background: var(--surface-secondary);
//       border-radius: 12px;
//       overflow: hidden;
//     }
    
//     .cluster-bubble {
//       position: absolute;
//       border-radius: 50%;
//       background: var(--accent);
//       opacity: 0.15;
//       cursor: pointer;
//       transition: all 0.2s;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }
    
//     .cluster-bubble:hover {
//       opacity: 0.3;
//       transform: scale(1.05);
//     }
    
//     .cluster-label {
//       position: absolute;
//       font-size: 0.6875rem;
//       font-weight: 500;
//       color: var(--text);
//       white-space: nowrap;
//       pointer-events: none;
//     }
    
//     .cluster-connection {
//       position: absolute;
//       height: 1px;
//       background: var(--border);
//       transform-origin: left center;
//       pointer-events: none;
//     }
    
//     /* Action Items */
//     .action-item {
//       padding: 1rem;
//       border: 1px solid var(--border);
//       border-radius: 10px;
//       margin-bottom: 0.75rem;
//     }
    
//     .action-item:last-child { margin-bottom: 0; }
    
//     .action-header {
//       display: flex;
//       align-items: flex-start;
//       justify-content: space-between;
//       gap: 0.75rem;
//       margin-bottom: 0.5rem;
//     }
    
//     .action-title {
//       font-size: 0.875rem;
//       font-weight: 500;
//     }
    
//     .action-priority {
//       font-size: 0.625rem;
//       font-weight: 600;
//       padding: 0.25rem 0.5rem;
//       border-radius: 4px;
//       flex-shrink: 0;
//     }
    
//     .action-priority.P0 {
//       background: var(--negative-light);
//       color: var(--negative);
//     }
    
//     .action-priority.P1 {
//       background: var(--warning-light);
//       color: var(--warning);
//     }
    
//     .action-priority.P2 {
//       background: var(--surface-secondary);
//       color: var(--text-secondary);
//     }
    
//     .action-desc {
//       font-size: 0.8125rem;
//       color: var(--text-secondary);
//       margin-bottom: 0.75rem;
//     }
    
//     .action-meta {
//       display: flex;
//       gap: 0.5rem;
//     }
    
//     .action-tag {
//       font-size: 0.6875rem;
//       padding: 0.25rem 0.5rem;
//       background: var(--surface-secondary);
//       border-radius: 4px;
//       color: var(--text-muted);
//     }
    
//     .action-export {
//       margin-left: auto;
//       padding: 0.375rem 0.75rem;
//       font-size: 0.6875rem;
//       font-weight: 500;
//       color: var(--accent);
//       background: var(--accent-light);
//       border: none;
//       border-radius: 6px;
//       cursor: pointer;
//     }
    
//     .action-export:hover {
//       background: var(--accent);
//       color: white;
//     }
    
//     /* Sentiment Bar */
//     .sentiment-row {
//       display: flex;
//       align-items: center;
//       gap: 1rem;
//       margin-bottom: 0.75rem;
//     }
    
//     .sentiment-bar {
//       flex: 1;
//       height: 6px;
//       background: var(--border);
//       border-radius: 3px;
//       overflow: hidden;
//       display: flex;
//     }
    
//     .sentiment-fill { height: 100%; }
//     .sentiment-fill.positive { background: var(--positive); }
//     .sentiment-fill.negative { background: var(--negative); }
    
//     .sentiment-label {
//       font-size: 0.75rem;
//       font-weight: 500;
//       color: var(--text-secondary);
//       min-width: 50px;
//     }
    
//     .sentiment-explanation {
//       font-size: 0.8125rem;
//       color: var(--text-secondary);
//     }
    
//     /* Risk Items */
//     .risk-item {
//       display: flex;
//       align-items: flex-start;
//       gap: 0.75rem;
//       padding: 0.75rem 0;
//       border-bottom: 1px solid var(--border);
//     }
    
//     .risk-item:last-child { border-bottom: none; padding-bottom: 0; }
//     .risk-item:first-child { padding-top: 0; }
    
//     .risk-dot {
//       width: 8px;
//       height: 8px;
//       border-radius: 50%;
//       margin-top: 0.375rem;
//       flex-shrink: 0;
//     }
    
//     .risk-dot.critical { background: var(--negative); }
//     .risk-dot.high { background: var(--warning); }
//     .risk-dot.medium { background: var(--text-muted); }
    
//     .risk-text {
//       font-size: 0.8125rem;
//       color: var(--text);
//     }
    
//     /* Evidence */
//     .quote-item {
//       padding: 0.875rem 0;
//       border-bottom: 1px solid var(--border);
//     }
    
//     .quote-item:last-child { border-bottom: none; padding-bottom: 0; }
//     .quote-item:first-child { padding-top: 0; }
    
//     .quote-text {
//       font-size: 0.875rem;
//       color: var(--text);
//       font-style: italic;
//     }
    
//     .quote-source {
//       font-size: 0.75rem;
//       color: var(--text-muted);
//       margin-top: 0.375rem;
//     }
    
//     /* Follow-ups */
//     .followups {
//       display: flex;
//       flex-wrap: wrap;
//       gap: 0.5rem;
//       margin-top: 1.5rem;
//     }
    
//     .followup-btn {
//       padding: 0.5rem 0.875rem;
//       font-family: inherit;
//       font-size: 0.8125rem;
//       color: var(--accent);
//       background: var(--surface);
//       border: 1px solid var(--border);
//       border-radius: 8px;
//       cursor: pointer;
//       transition: all 0.15s;
//     }
    
//     .followup-btn:hover {
//       background: var(--accent);
//       color: white;
//       border-color: var(--accent);
//     }
    
//     /* Init notice */
//     .init-notice {
//       position: fixed;
//       bottom: 1.5rem;
//       left: 50%;
//       transform: translateX(-50%);
//       background: var(--surface);
//       padding: 0.875rem 1.25rem;
//       border-radius: 12px;
//       box-shadow: 0 4px 20px rgba(0,0,0,0.1);
//       display: flex;
//       align-items: center;
//       gap: 1rem;
//       font-size: 0.875rem;
//       z-index: 50;
//     }
    
//     .init-btn {
//       padding: 0.5rem 1rem;
//       font-family: inherit;
//       font-size: 0.8125rem;
//       font-weight: 500;
//       color: white;
//       background: var(--accent);
//       border: none;
//       border-radius: 8px;
//       cursor: pointer;
//     }
    
//     /* Keyboard shortcuts modal */
//     .shortcuts-overlay {
//       position: fixed;
//       inset: 0;
//       background: rgba(0,0,0,0.4);
//       backdrop-filter: blur(4px);
//       display: none;
//       align-items: center;
//       justify-content: center;
//       z-index: 100;
//     }
    
//     .shortcuts-overlay.visible { display: flex; }
    
//     .shortcuts-modal {
//       background: var(--surface);
//       border-radius: 16px;
//       padding: 1.5rem;
//       width: 100%;
//       max-width: 320px;
//     }
    
//     .shortcuts-title {
//       font-size: 0.875rem;
//       font-weight: 600;
//       margin-bottom: 1rem;
//     }
    
//     .shortcut-row {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       padding: 0.5rem 0;
//       font-size: 0.8125rem;
//     }
    
//     .shortcut-keys {
//       display: flex;
//       gap: 0.25rem;
//     }
    
//     .key {
//       padding: 0.25rem 0.5rem;
//       background: var(--surface-secondary);
//       border: 1px solid var(--border);
//       border-radius: 4px;
//       font-size: 0.6875rem;
//       font-weight: 500;
//     }
    
//     footer {
//       text-align: center;
//       padding: 2rem 1rem;
//       font-size: 0.75rem;
//       color: var(--text-muted);
//     }
    
//     footer a { color: var(--text-secondary); text-decoration: none; }
    
//     @media (max-width: 640px) {
//       .app { padding: 1.5rem 1rem; }
//       .header { flex-wrap: wrap; gap: 1rem; }
//       .stat-grid { grid-template-columns: repeat(2, 1fr); }
//     }
//   </style>
// </head>
// <body>
//   <div class="app">
//     <!-- Header -->
//     <header class="header">
//       <div class="brand">
//         <span class="logo"><span class="logo-icon">✦</span> Feedback Copilot</span>
//       </div>
//       <div class="header-actions">
//         <button class="icon-btn" onclick="toggleBriefing()" title="Morning Briefing">
//           <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
//           </svg>
//         </button>
//         <button class="icon-btn" onclick="toggleShortcuts()" title="Keyboard Shortcuts">
//           <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
//           </svg>
//         </button>
//       </div>
//     </header>
    
//     <!-- Command Box -->
//     <div class="command-box">
//       <div class="input-row">
//         <input 
//           type="text" 
//           class="command-input" 
//           id="input"
//           placeholder="Ask about your feedback..."
//           autocomplete="off"
//         >
//         <button class="submit-btn" id="submitBtn" onclick="analyze()">
//           <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
//           </svg>
//         </button>
//       </div>
//       <div class="sources-row" id="sources">
//         <span class="source-chip active" data-source="support">Support</span>
//         <span class="source-chip active" data-source="github">GitHub</span>
//         <span class="source-chip active" data-source="discord">Discord</span>
//         <span class="source-chip active" data-source="twitter">Twitter</span>
//         <span class="source-chip active" data-source="in_app">In-App</span>
//       </div>
//     </div>
    
//     <!-- Quick Prompts -->
//     <div class="prompts" id="prompts">
//       <button class="prompt-btn" onclick="ask('What are users frustrated about?')">😤 Frustrations</button>
//       <button class="prompt-btn" onclick="ask('What do users love?')">❤️ What's loved</button>
//       <button class="prompt-btn" onclick="ask('What needs urgent attention?')">🚨 Urgent</button>
//       <button class="prompt-btn" onclick="ask('What are the top feature requests?')">✨ Requests</button>
//     </div>
    
//     <!-- Conversation History -->
//     <div class="history" id="history"></div>
    
//     <!-- Results -->
//     <div class="results" id="results"></div>
    
//     <footer>
//       Built with <a href="https://developers.cloudflare.com/workers/">Workers</a>, 
//       <a href="https://developers.cloudflare.com/d1/">D1</a> & 
//       <a href="https://developers.cloudflare.com/workers-ai/">Workers AI</a>
//       <br><span style="color: var(--text-muted);">Press <kbd class="kbd">?</kbd> for shortcuts</span>
//     </footer>
//   </div>
  
//   <!-- Morning Briefing Modal -->
//   <div class="briefing-overlay" id="briefingOverlay" onclick="if(event.target === this) toggleBriefing()">
//     <div class="briefing-modal">
//       <div class="briefing-header">
//         <div>
//           <div class="briefing-title">☀️ Morning Briefing</div>
//           <div class="briefing-date" id="briefingDate"></div>
//         </div>
//         <button class="close-btn" onclick="toggleBriefing()">✕</button>
//       </div>
//       <div class="briefing-content" id="briefingContent">
//         <div class="loading">
//           <div class="spinner"></div>
//           <p>Loading briefing...</p>
//         </div>
//       </div>
//     </div>
//   </div>
  
//   <!-- Keyboard Shortcuts Modal -->
//   <div class="shortcuts-overlay" id="shortcutsOverlay" onclick="if(event.target === this) toggleShortcuts()">
//     <div class="shortcuts-modal">
//       <div class="shortcuts-title">⌨️ Keyboard Shortcuts</div>
//       <div class="shortcut-row">
//         <span>Focus search</span>
//         <div class="shortcut-keys"><span class="key">⌘</span><span class="key">K</span></div>
//       </div>
//       <div class="shortcut-row">
//         <span>Toggle sources</span>
//         <div class="shortcut-keys"><span class="key">1</span>-<span class="key">5</span></div>
//       </div>
//       <div class="shortcut-row">
//         <span>Morning briefing</span>
//         <div class="shortcut-keys"><span class="key">B</span></div>
//       </div>
//       <div class="shortcut-row">
//         <span>Show shortcuts</span>
//         <div class="shortcut-keys"><span class="key">?</span></div>
//       </div>
//       <div class="shortcut-row">
//         <span>Close modal</span>
//         <div class="shortcut-keys"><span class="key">Esc</span></div>
//       </div>
//     </div>
//   </div>
  
//   <!-- Init Notice -->
//   <div class="init-notice" id="initNotice" style="display:none;">
//     <span>Database needs setup</span>
//     <button class="init-btn" onclick="init()">Initialize</button>
//   </div>

//   <script>
//     // State
//     let sources = ['support', 'github', 'discord', 'twitter', 'in_app'];
//     let conversation = [];
//     let lastData = null;
    
//     // Initialize
//     document.addEventListener('DOMContentLoaded', () => {
//       loadSources();
//       setupKeyboard();
//       setupSourceChips();
//       document.getElementById('input').addEventListener('keypress', e => {
//         if (e.key === 'Enter') analyze();
//       });
//     });
    
//     function setupSourceChips() {
//       document.querySelectorAll('.source-chip').forEach((chip, i) => {
//         chip.onclick = () => {
//           chip.classList.toggle('active');
//           const s = chip.dataset.source;
//           sources = chip.classList.contains('active') 
//             ? [...sources, s] 
//             : sources.filter(x => x !== s);
//         };
//       });
//     }
    
//     function setupKeyboard() {
//       document.addEventListener('keydown', e => {
//         // Ignore if typing in input
//         if (e.target.tagName === 'INPUT') {
//           if (e.key === 'Escape') e.target.blur();
//           return;
//         }
        
//         if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
//           e.preventDefault();
//           document.getElementById('input').focus();
//         }
        
//         if (e.key >= '1' && e.key <= '5') {
//           const chips = document.querySelectorAll('.source-chip');
//           const idx = parseInt(e.key) - 1;
//           if (chips[idx]) chips[idx].click();
//         }
        
//         if (e.key === 'b' || e.key === 'B') toggleBriefing();
//         if (e.key === '?') toggleShortcuts();
//         if (e.key === 'Escape') {
//           document.getElementById('briefingOverlay').classList.remove('visible');
//           document.getElementById('shortcutsOverlay').classList.remove('visible');
//         }
//       });
//     }
    
//     async function loadSources() {
//       try {
//         const res = await fetch('/api/sources');
//         const data = await res.json();
//         if (!data.length) document.getElementById('initNotice').style.display = 'flex';
//       } catch {
//         document.getElementById('initNotice').style.display = 'flex';
//       }
//     }
    
//     async function init() {
//       const btn = document.querySelector('.init-btn');
//       btn.textContent = 'Setting up...';
//       const res = await fetch('/api/init');
//       const data = await res.json();
//       if (data.success) {
//         document.getElementById('initNotice').style.display = 'none';
//         loadSources();
//       }
//       btn.textContent = 'Initialize';
//     }
    
//     // Morning Briefing
//     async function toggleBriefing() {
//       const overlay = document.getElementById('briefingOverlay');
//       const isVisible = overlay.classList.contains('visible');
      
//       if (isVisible) {
//         overlay.classList.remove('visible');
//       } else {
//         overlay.classList.add('visible');
//         document.getElementById('briefingDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        
//         const content = document.getElementById('briefingContent');
//         content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
//         try {
//           const res = await fetch('/api/briefing');
//           const data = await res.json();
//           renderBriefing(data);
//         } catch (err) {
//           content.innerHTML = '<p>Failed to load briefing</p>';
//         }
//       }
//     }
    
//     function renderBriefing(data) {
//       const s = data.stats || {};
//       document.getElementById('briefingContent').innerHTML = \`
//         <div class="briefing-section">
//           <div class="briefing-section-title">This Week's Numbers</div>
//           <div class="stat-grid">
//             <div class="stat-card">
//               <div class="stat-value">\${s.total || 0}</div>
//               <div class="stat-label">Total feedback</div>
//             </div>
//             <div class="stat-card">
//               <div class="stat-value negative">\${s.urgent || 0}</div>
//               <div class="stat-label">Urgent items</div>
//             </div>
//             <div class="stat-card">
//               <div class="stat-value">\${s.today || 0}</div>
//               <div class="stat-label">New today</div>
//             </div>
//           </div>
//         </div>
        
//         <div class="briefing-section">
//           <div class="briefing-section-title">Top Pain Points</div>
//           \${(data.topIssues || []).map(i => \`
//             <div class="issue-item">
//               <span class="issue-name">\${i.product_area}</span>
//               <span class="issue-count">\${i.count} complaints</span>
//             </div>
//           \`).join('') || '<p style="color: var(--text-muted); font-size: 0.875rem;">No major issues this week</p>'}
//         </div>
        
//         \${(data.criticalItems || []).length ? \`
//         <div class="briefing-section">
//           <div class="briefing-section-title">🚨 Critical Items</div>
//           \${data.criticalItems.map(c => \`
//             <div class="critical-item">
//               "\${c.content}"
//               <div class="critical-source">via \${c.source}</div>
//             </div>
//           \`).join('')}
//         </div>
//         \` : ''}
        
//         <div class="briefing-section">
//           <div class="briefing-section-title">🎉 Wins</div>
//           \${(data.positiveWins || []).map(w => \`
//             <div class="win-item">"\${w.content}"</div>
//           \`).join('') || '<p style="color: var(--text-muted); font-size: 0.875rem;">Keep up the good work!</p>'}
//         </div>
//       \`;
//     }
    
//     function toggleShortcuts() {
//       document.getElementById('shortcutsOverlay').classList.toggle('visible');
//     }
    
//     function ask(q) {
//       document.getElementById('input').value = q;
//       analyze();
//     }
    
//     async function analyze() {
//       const q = document.getElementById('input').value.trim();
//       if (!q) return;
      
//       const results = document.getElementById('results');
//       const btn = document.getElementById('submitBtn');
//       const prompts = document.getElementById('prompts');
      
//       btn.disabled = true;
//       prompts.style.display = 'none';
//       results.classList.add('visible');
//       results.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing feedback...</p></div>';
      
//       try {
//         const res = await fetch('/api/analyze', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ question: q, sources })
//         });
        
//         lastData = await res.json();
        
//         // Add to conversation
//         conversation.push({ q, summary: lastData.summary });
//         renderHistory();
//         render(lastData);
        
//       } catch (err) {
//         results.innerHTML = '<div class="loading">Something went wrong</div>';
//       }
      
//       btn.disabled = false;
//       document.getElementById('input').value = '';
//     }
    
//     function renderHistory() {
//       const el = document.getElementById('history');
//       if (conversation.length <= 1) {
//         el.innerHTML = '';
//         return;
//       }
      
//       // Show all but latest
//       el.innerHTML = conversation.slice(0, -1).map(c => \`
//         <div class="history-item">
//           <div class="history-q">\${c.q}</div>
//           <div class="history-a">\${c.summary}</div>
//         </div>
//       \`).join('');
//     }
    
//     function render(d) {
//       const results = document.getElementById('results');
      
//       let html = \`
//         <div class="summary-card">
//           <p class="summary-text">\${d.summary}</p>
//           <div class="summary-meta">
//             <span>\${d.meta?.count || 0} items analyzed</span>
//             <div class="export-btns">
//               <button class="export-btn" onclick="copyMarkdown()">Markdown</button>
//               <button class="export-btn" onclick="copySlack()">Slack</button>
//             </div>
//           </div>
//         </div>
//       \`;
      
//       // Themes with Sparklines
//       if (d.themes?.length) {
//         html += \`
//           <div class="section open" onclick="this.classList.toggle('open')">
//             <div class="section-header">
//               <span class="section-title">Key Themes <span class="badge">\${d.themes.length}</span></span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               \${d.themes.map(t => \`
//                 <div class="theme-item">
//                   <div class="theme-info">
//                     <div class="theme-name">
//                       <span class="sentiment-dot \${t.sentiment || 'mixed'}"></span>
//                       \${t.name}
//                       <span class="trend-indicator \${t.trend || 'flat'}">\${t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}</span>
//                     </div>
//                     <div class="theme-desc">\${t.description}</div>
//                   </div>
//                   <div class="sparkline \${t.sentiment === 'negative' ? 'negative' : ''}">
//                     \${renderSparkline(t.trendData || [3,4,2,5,3,6,4])}
//                   </div>
//                 </div>
//               \`).join('')}
//             </div>
//           </div>
//         \`;
//       }
      
//       // Theme Clusters
//       if (d.clusters?.length) {
//         html += \`
//           <div class="section" onclick="this.classList.toggle('open')">
//             <div class="section-header">
//               <span class="section-title">Theme Clusters</span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               <div class="cluster-map" id="clusterMap">
//                 \${renderClusters(d.clusters)}
//               </div>
//             </div>
//           </div>
//         \`;
//       }
      
//       // Sentiment
//       if (d.sentiment) {
//         const pos = d.sentiment.positive || 30;
//         const neg = d.sentiment.negative || 30;
//         html += \`
//           <div class="section" onclick="this.classList.toggle('open')">
//             <div class="section-header">
//               <span class="section-title">Sentiment</span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               <div class="sentiment-row">
//                 <div class="sentiment-bar">
//                   <div class="sentiment-fill positive" style="width:\${pos}%"></div>
//                   <div class="sentiment-fill negative" style="width:\${neg}%"></div>
//                 </div>
//                 <span class="sentiment-label">\${d.sentiment.overall}</span>
//               </div>
//               <p class="sentiment-explanation">\${d.sentiment.explanation || ''}</p>
//             </div>
//           </div>
//         \`;
//       }
      
//       // Action Items
//       if (d.actions?.length) {
//         html += \`
//           <div class="section open" onclick="event.stopPropagation(); this.classList.toggle('open')">
//             <div class="section-header" onclick="event.stopPropagation(); this.parentElement.classList.toggle('open')">
//               <span class="section-title">📋 Action Items <span class="badge">\${d.actions.length}</span></span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               \${d.actions.map(a => \`
//                 <div class="action-item">
//                   <div class="action-header">
//                     <span class="action-title">\${a.title}</span>
//                     <span class="action-priority \${a.priority}">\${a.priority}</span>
//                   </div>
//                   <div class="action-desc">\${a.description}</div>
//                   <div class="action-meta">
//                     <span class="action-tag">\${a.type || 'task'}</span>
//                     <span class="action-tag">\${a.effort || 'medium'} effort</span>
//                     <button class="action-export" onclick="event.stopPropagation(); copyJira('\${a.title.replace(/'/g, "\\\\'")}', '\${a.description.replace(/'/g, "\\\\'")}', '\${a.priority}')">Copy as Jira</button>
//                   </div>
//                 </div>
//               \`).join('')}
//             </div>
//           </div>
//         \`;
//       }
      
//       // Risks
//       if (d.risks?.length) {
//         html += \`
//           <div class="section" onclick="this.classList.toggle('open')">
//             <div class="section-header">
//               <span class="section-title">Risks <span class="badge warning">\${d.risks.length}</span></span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               \${d.risks.map(r => \`
//                 <div class="risk-item">
//                   <span class="risk-dot \${r.urgency}"></span>
//                   <span class="risk-text">\${r.signal}</span>
//                 </div>
//               \`).join('')}
//             </div>
//           </div>
//         \`;
//       }
      
//       // Evidence
//       if (d.evidence?.length) {
//         html += \`
//           <div class="section" onclick="this.classList.toggle('open')">
//             <div class="section-header">
//               <span class="section-title">Evidence</span>
//               <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
//               </svg>
//             </div>
//             <div class="section-content">
//               \${d.evidence.map(e => \`
//                 <div class="quote-item">
//                   <p class="quote-text">"\${e.quote}"</p>
//                   <p class="quote-source">— \${e.source}</p>
//                 </div>
//               \`).join('')}
//             </div>
//           </div>
//         \`;
//       }
      
//       // Follow-ups
//       if (d.followups?.length) {
//         html += \`
//           <div class="followups">
//             \${d.followups.map(f => \`<button class="followup-btn" onclick="ask('\${f.replace(/'/g, "\\\\'")}');">\${f}</button>\`).join('')}
//           </div>
//         \`;
//       }
      
//       results.innerHTML = html;
//     }
    
//     function renderSparkline(data) {
//       if (!data || !data.length) data = [3,4,2,5,3,6,4];
//       const max = Math.max(...data);
//       const min = Math.min(...data);
//       const range = max - min || 1;
//       const width = 60;
//       const height = 24;
//       const padding = 2;
      
//       const points = data.map((v, i) => {
//         const x = padding + (i / (data.length - 1)) * (width - padding * 2);
//         const y = height - padding - ((v - min) / range) * (height - padding * 2);
//         return \`\${x},\${y}\`;
//       }).join(' ');
      
//       return \`<svg viewBox="0 0 \${width} \${height}"><path d="M \${points.replace(/ /g, ' L ')}"/></svg>\`;
//     }
    
//     function renderClusters(clusters) {
//       if (!clusters?.length) return '';
      
//       return clusters.map((c, i) => {
//         const size = Math.max(40, Math.min(80, (c.size || 3) * 15));
//         const x = c.x || (20 + i * 30);
//         const y = c.y || (30 + (i % 2) * 40);
        
//         return \`
//           <div class="cluster-bubble" style="left:\${x}%; top:\${y}%; width:\${size}px; height:\${size}px; transform: translate(-50%, -50%);" onclick="event.stopPropagation(); ask('Tell me more about \${c.name}')"></div>
//           <div class="cluster-label" style="left:\${x}%; top:calc(\${y}% + \${size/2 + 8}px); transform: translateX(-50%);">\${c.name}</div>
//         \`;
//       }).join('');
//     }
    
//     // Export functions
//     async function copyMarkdown() {
//       if (!lastData) return;
//       const text = \`# Feedback Analysis

// ## Summary
// \${lastData.summary}

// ## Key Themes
// \${lastData.themes?.map(t => \`- **\${t.name}** (\${t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}): \${t.description}\`).join('\\n') || 'None'}

// ## Action Items
// \${lastData.actions?.map(a => \`- [\${a.priority}] \${a.title}: \${a.description}\`).join('\\n') || 'None'}

// ## Risks
// \${lastData.risks?.map(r => \`- [\${r.urgency}] \${r.signal}\`).join('\\n') || 'None'}
// \`;
//       await navigator.clipboard.writeText(text);
//       showToast('Copied as Markdown');
//     }
    
//     async function copySlack() {
//       if (!lastData) return;
//       const text = \`*📊 Feedback Analysis*

// *Summary:* \${lastData.summary}

// *Key Themes:*
// \${lastData.themes?.map(t => \`• \${t.name} \${t.trend === 'up' ? ':chart_with_upwards_trend:' : t.trend === 'down' ? ':chart_with_downwards_trend:' : ''}\`).join('\\n') || 'None'}

// *Action Items:*
// \${lastData.actions?.map(a => \`• [\${a.priority}] \${a.title}\`).join('\\n') || 'None'}

// *Risks:*
// \${lastData.risks?.map(r => \`• :warning: \${r.signal}\`).join('\\n') || 'None'}
// \`;
//       await navigator.clipboard.writeText(text);
//       showToast('Copied for Slack');
//     }
    
//     async function copyJira(title, desc, priority) {
//       const text = \`**Title:** \${title}

// **Priority:** \${priority}

// **Description:**
// \${desc}

// ---
// _Auto-generated from Feedback Copilot_\`;
//       await navigator.clipboard.writeText(text);
//       showToast('Copied as Jira ticket');
//     }
    
//     function showToast(msg) {
//       const toast = document.createElement('div');
//       toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.875rem;z-index:200;';
//       toast.textContent = msg;
//       document.body.appendChild(toast);
//       setTimeout(() => toast.remove(), 2000);
//     }
//   </script>
// </body>
// </html>`;
// }



/**
 * Feedback Copilot v5 - Thread Management Edition
 * 
 * New in v5:
 * - Smart Thread Detection (continue vs new)
 * - Thread List with branching conversations
 * - Click to switch between threads
 * - New Thread button
 * - Thread messages showing conversation flow
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      return handleAnalyze(request, env);
    }
    if (url.pathname === '/api/briefing') {
      return handleBriefing(env);
    }
    if (url.pathname === '/api/sources') {
      return handleSources(env);
    }
    if (url.pathname === '/api/trends') {
      return handleTrends(env);
    }
    if (url.pathname === '/api/init') {
      return handleInit(env);
    }
    
    return new Response(renderHTML(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};

async function handleInit(env) {
  try {
    await env.DB.prepare('DROP TABLE IF EXISTS feedback').run();
    
    await env.DB.prepare(`
      CREATE TABLE feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        product_area TEXT,
        content TEXT NOT NULL,
        sentiment TEXT,
        urgency TEXT DEFAULT 'normal',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    
    await env.DB.prepare('CREATE INDEX idx_feedback_source ON feedback(source)').run();
    await env.DB.prepare('CREATE INDEX idx_feedback_created ON feedback(created_at)').run();
    
    const mockData = getMockFeedback();
    for (const item of mockData) {
      await env.DB.prepare(
        'INSERT INTO feedback (source, product_area, content, sentiment, urgency, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(item.source, item.product_area, item.content, item.sentiment, item.urgency, item.created_at).run();
    }
    
    return Response.json({ success: true, message: `Initialized with ${mockData.length} feedback items` });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handleSources(env) {
  try {
    const results = await env.DB.prepare(`
      SELECT source, COUNT(*) as count,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN urgency IN ('high', 'critical') THEN 1 ELSE 0 END) as urgent
      FROM feedback GROUP BY source
    `).all();
    return Response.json(results.results || []);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleTrends(env) {
  try {
    const thisWeek = await env.DB.prepare(`
      SELECT product_area, COUNT(*) as count, 
        AVG(CASE WHEN sentiment = 'negative' THEN 1 WHEN sentiment = 'positive' THEN -1 ELSE 0 END) as severity
      FROM feedback 
      WHERE created_at >= datetime('now', '-7 days') AND product_area IS NOT NULL
      GROUP BY product_area ORDER BY count DESC LIMIT 5
    `).all();
    
    const lastWeek = await env.DB.prepare(`
      SELECT product_area, COUNT(*) as count
      FROM feedback 
      WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days') AND product_area IS NOT NULL
      GROUP BY product_area
    `).all();
    
    const lastWeekMap = {};
    (lastWeek.results || []).forEach(r => lastWeekMap[r.product_area] = r.count);
    
    const trends = (thisWeek.results || []).map(r => ({
      area: r.product_area,
      count: r.count,
      severity: r.severity,
      lastWeek: lastWeekMap[r.product_area] || 0,
      trend: r.count > (lastWeekMap[r.product_area] || 0) ? 'up' : 
             r.count < (lastWeekMap[r.product_area] || 0) ? 'down' : 'flat'
    }));
    
    return Response.json({ trends });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleBriefing(env) {
  try {
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN created_at >= datetime('now', '-1 days') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN urgency IN ('high', 'critical') THEN 1 ELSE 0 END) as urgent
      FROM feedback WHERE created_at >= datetime('now', '-7 days')
    `).first();
    
    const topIssues = await env.DB.prepare(`
      SELECT product_area, COUNT(*) as count
      FROM feedback 
      WHERE sentiment = 'negative' AND created_at >= datetime('now', '-7 days')
      GROUP BY product_area ORDER BY count DESC LIMIT 3
    `).all();
    
    const criticalItems = await env.DB.prepare(`
      SELECT source, content FROM feedback 
      WHERE urgency = 'critical' AND created_at >= datetime('now', '-3 days')
      LIMIT 3
    `).all();
    
    const positiveWins = await env.DB.prepare(`
      SELECT content FROM feedback 
      WHERE sentiment = 'positive' AND created_at >= datetime('now', '-7 days')
      ORDER BY RANDOM() LIMIT 2
    `).all();
    
    return Response.json({
      stats,
      topIssues: topIssues.results || [],
      criticalItems: criticalItems.results || [],
      positiveWins: positiveWins.results || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleAnalyze(request, env) {
  try {
    const { question, sources, threadContext } = await request.json();
    
    if (!question) {
      return Response.json({ error: 'Question is required' }, { status: 400 });
    }
    
    let query = 'SELECT * FROM feedback';
    let params = [];
    
    if (sources?.length > 0) {
      query += ` WHERE source IN (${sources.map(() => '?').join(',')})`;
      params = sources;
    }
    
    const stmt = env.DB.prepare(query);
    const feedbackResults = sources?.length > 0 
      ? await stmt.bind(...params).all() 
      : await stmt.all();
    
    const feedback = feedbackResults.results || [];
    
    if (feedback.length === 0) {
      return Response.json({
        summary: 'No feedback found for the selected sources.',
        themes: [], sentiment: {}, risks: [], evidence: [], 
        actions: [], clusters: [], followups: []
      });
    }
    
    const feedbackText = feedback.map((f, i) => 
      `[${i + 1}] ${f.source} | ${f.product_area || 'general'} | ${f.sentiment} | ${f.urgency}\n"${f.content}"`
    ).join('\n\n');
    
    // Include thread context if it's a follow-up
    const contextPrompt = threadContext 
      ? `\n\nPrevious conversation context:\n${threadContext}\n\nThe user is asking a follow-up question based on this context.`
      : '';
    
    const systemPrompt = `You are a product analyst. Analyze feedback and return JSON:

{
  "summary": "3-4 sentence executive summary",
  "themes": [
    {
      "name": "Theme name",
      "description": "One sentence",
      "sentiment": "positive|negative|mixed",
      "count": number,
      "trend": "up|down|flat",
      "trendData": [3, 5, 2, 7, 4, 6, 8]
    }
  ],
  "sentiment": {
    "overall": "positive|negative|neutral|mixed",
    "positive": percent_number,
    "negative": percent_number,
    "explanation": "One sentence"
  },
  "risks": [
    {"signal": "Risk description", "urgency": "critical|high|medium", "area": "product_area"}
  ],
  "evidence": [
    {"quote": "Short quote", "source": "source_name"}
  ],
  "actions": [
    {
      "title": "Action item title",
      "description": "What to do",
      "priority": "P0|P1|P2",
      "type": "bug|feature|docs|ops",
      "effort": "small|medium|large"
    }
  ],
  "clusters": [
    {
      "id": "cluster_id",
      "name": "Cluster name",
      "themes": ["theme1", "theme2"],
      "size": number,
      "x": 0-100,
      "y": 0-100
    }
  ],
  "followups": ["Question 1?", "Question 2?"]
}

Generate 2-3 actions, 2-3 clusters. trendData is 7 numbers representing last 7 days.${contextPrompt}`;

    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: "${question}"\n\nFeedback (${feedback.length} items):\n\n${feedbackText}\n\nJSON:` }
      ],
      max_tokens: 2500
    });
    
    let analysis;
    try {
      const responseText = aiResponse.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      if (!analysis) throw new Error('No JSON');
    } catch {
      analysis = {
        summary: aiResponse.response || 'Analysis could not be parsed',
        themes: [], sentiment: { overall: 'mixed' }, risks: [],
        evidence: [], actions: [], clusters: [], followups: []
      };
    }
    
    analysis.meta = { 
      count: feedback.length, 
      sources: [...new Set(feedback.map(f => f.source))],
      timestamp: new Date().toISOString()
    };
    
    return Response.json(analysis);
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function getMockFeedback() {
  const now = new Date();
  const daysAgo = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  };
  
  return [
    { source: 'support', product_area: 'authentication', content: "SSO implementation is blocked - documentation doesn't match the current API version.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
    { source: 'support', product_area: 'billing', content: "Love the new usage dashboard! Finally can see where our costs are going.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
    { source: 'support', product_area: 'api', content: "Getting random 502 errors on /v2/analyze. Affects about 10% of our requests.", sentiment: 'negative', urgency: 'critical', created_at: daysAgo(0) },
    { source: 'support', product_area: 'onboarding', content: "New developer got set up in 15 minutes. Quickstart guide is excellent.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(2) },
    { source: 'support', product_area: 'pricing', content: "Pro to Enterprise jump is too steep for mid-size companies.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(1) },
    { source: 'support', product_area: 'authentication', content: "MFA setup fails silently. No error message, just redirects back.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
    { source: 'support', product_area: 'api', content: "Rate limits aren't clearly documented. Got throttled unexpectedly.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(3) },
    { source: 'github', product_area: 'sdk', content: "Python SDK missing type hints. Would love to contribute a PR.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
    { source: 'github', product_area: 'api', content: "Feature request: Add webhook support for real-time notifications.", sentiment: 'neutral', urgency: 'normal', created_at: daysAgo(4) },
    { source: 'github', product_area: 'sdk', content: "Node.js SDK crashes when payload exceeds 10MB.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(1) },
    { source: 'github', product_area: 'documentation', content: "API reference is great but missing common use case guides.", sentiment: 'mixed', urgency: 'low', created_at: daysAgo(5) },
    { source: 'github', product_area: 'cli', content: "CLI doesn't respect .env files in subdirectories.", sentiment: 'negative', urgency: 'low', created_at: daysAgo(3) },
    { source: 'github', product_area: 'sdk', content: "Java SDK hasn't been updated in 6 months. Missing new endpoints.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(2) },
    { source: 'discord', product_area: 'general', content: "Just shipped my first project! The DX is incredible.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(0) },
    { source: 'discord', product_area: 'onboarding', content: "Can't find where API keys moved to in the new dashboard.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(0) },
    { source: 'discord', product_area: 'pricing', content: "Free tier is so generous I feel guilty not paying.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
    { source: 'discord', product_area: 'api', content: "API seems slower today. 2-3x latency compared to yesterday.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
    { source: 'discord', product_area: 'general', content: "Community is so helpful. Got my question answered in 5 minutes.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
    { source: 'discord', product_area: 'documentation', content: "'Coming soon' page hasn't been updated in 8 months.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(2) },
    { source: 'twitter', product_area: 'general', content: "Switched from competitor - build times dropped by 60%!", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
    { source: 'twitter', product_area: 'pricing', content: "Love the product but pricing page is confusing.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
    { source: 'twitter', product_area: 'api', content: "API down for 20 mins, production affected, no status update.", sentiment: 'negative', urgency: 'critical', created_at: daysAgo(0) },
    { source: 'twitter', product_area: 'general', content: "Thread: Why I'm migrating all clients to this platform (1/12)", sentiment: 'positive', urgency: 'low', created_at: daysAgo(3) },
    { source: 'twitter', product_area: 'onboarding', content: "Verification email never arrived. Tried 3 times. Giving up.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
    { source: 'in_app', product_area: 'ui', content: "Dark mode is beautiful. Easy on the eyes for late nights.", sentiment: 'positive', urgency: 'low', created_at: daysAgo(1) },
    { source: 'in_app', product_area: 'performance', content: "Dashboard takes 8+ seconds to load with 50+ projects.", sentiment: 'negative', urgency: 'high', created_at: daysAgo(0) },
    { source: 'in_app', product_area: 'ui', content: "Please add keyboard shortcuts. Using this all day.", sentiment: 'neutral', urgency: 'normal', created_at: daysAgo(4) },
    { source: 'in_app', product_area: 'billing', content: "Got double charged. Support fixed it but shouldn't happen.", sentiment: 'mixed', urgency: 'normal', created_at: daysAgo(2) },
    { source: 'in_app', product_area: 'api', content: "Rate limit errors don't say when I can retry.", sentiment: 'negative', urgency: 'normal', created_at: daysAgo(1) },
    { source: 'in_app', product_area: 'performance', content: "Search is instant now. Whatever you did, thank you!", sentiment: 'positive', urgency: 'low', created_at: daysAgo(0) }
  ];
}

function renderHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Copilot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-gradient: linear-gradient(160deg, #dbeafe 0%, #ede9fe 50%, #fce7f3 100%);
      --surface: #ffffff;
      --surface-secondary: #f8fafc;
      --text: #0f172a;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --accent: #6366f1;
      --accent-light: #eef2ff;
      --positive: #10b981;
      --positive-light: #d1fae5;
      --negative: #ef4444;
      --negative-light: #fee2e2;
      --warning: #f59e0b;
      --warning-light: #fef3c7;
    }
    
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg-gradient);
      background-attachment: fixed;
      min-height: 100vh;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    
    .app {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    
    .logo {
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    .logo-icon { color: var(--accent); }
    
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    
    .icon-btn:hover { border-color: var(--text-secondary); color: var(--text); }
    .icon-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
    .icon-btn svg { width: 18px; height: 18px; }
    
    /* Thread List */
    .threads-container {
      background: var(--surface);
      border-radius: 12px;
      margin-bottom: 1rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    
    .threads-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
    }
    
    .threads-header:hover { background: var(--surface-secondary); }
    
    .threads-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .thread-count {
      background: var(--accent-light);
      color: var(--accent);
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }
    
    .threads-toggle {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      transition: transform 0.2s;
    }
    
    .threads-container.collapsed .threads-toggle { transform: rotate(-90deg); }
    .threads-container.collapsed .threads-list { display: none; }
    
    .threads-list {
      max-height: 200px;
      overflow-y: auto;
    }
    
    .thread-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid var(--border);
    }
    
    .thread-item:last-child { border-bottom: none; }
    .thread-item:hover { background: var(--surface-secondary); }
    .thread-item.active { background: var(--accent-light); }
    
    .thread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      flex-shrink: 0;
    }
    
    .thread-item.active .thread-dot { background: var(--accent); }
    
    .thread-info { flex: 1; min-width: 0; }
    
    .thread-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .thread-meta {
      font-size: 0.6875rem;
      color: var(--text-muted);
      margin-top: 0.125rem;
    }
    
    .thread-delete {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.15s;
    }
    
    .thread-item:hover .thread-delete { opacity: 1; }
    .thread-delete:hover { background: var(--negative-light); color: var(--negative); }
    
    .new-thread-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--accent);
      background: transparent;
      border: none;
      border-top: 1px solid var(--border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.15s;
    }
    
    .new-thread-btn:hover { background: var(--accent-light); }
    
    /* Command Box */
    .command-box {
      background: var(--surface);
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.04);
      margin-bottom: 1rem;
      overflow: hidden;
    }
    
    .command-box:focus-within {
      box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(99,102,241,0.12);
    }
    
    .thread-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--accent-light);
      font-size: 0.75rem;
      color: var(--accent);
    }
    
    .thread-indicator.new-thread { background: var(--surface-secondary); color: var(--text-muted); }
    
    .input-row {
      display: flex;
      align-items: center;
      padding: 0.5rem;
    }
    
    .command-input {
      flex: 1;
      padding: 0.875rem 1rem;
      font-family: inherit;
      font-size: 1rem;
      border: none;
      background: transparent;
      color: var(--text);
      outline: none;
    }
    
    .command-input::placeholder { color: var(--text-muted); }
    
    .submit-btn {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: none;
      background: var(--text);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    
    .submit-btn:hover { transform: scale(1.05); }
    .submit-btn:disabled { opacity: 0.4; transform: none; }
    .submit-btn svg { width: 18px; height: 18px; }
    
    .sources-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1rem;
      border-top: 1px solid var(--border);
    }
    
    .source-chip {
      padding: 0.375rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .source-chip:hover { border-color: var(--text-secondary); }
    .source-chip.active { background: var(--accent-light); border-color: transparent; color: var(--accent); }
    
    /* Quick prompts */
    .prompts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .prompt-btn {
      padding: 0.5rem 0.875rem;
      font-family: inherit;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.7);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .prompt-btn:hover { background: var(--surface); color: var(--text); }
    
    /* Thread Messages */
    .thread-messages {
      background: var(--surface);
      border-radius: 12px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    
    .thread-messages-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .message-item {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    
    .message-item:last-child { border-bottom: none; }
    
    .message-question {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent);
      margin-bottom: 0.375rem;
    }
    
    .message-answer {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    /* Results */
    .results { display: none; }
    .results.visible { display: block; }
    
    /* Loading */
    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }
    
    .spinner {
      width: 32px;
      height: 32px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Summary Card */
    .summary-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .summary-text {
      font-size: 1.0625rem;
      line-height: 1.7;
    }
    
    .summary-meta {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .export-btns { display: flex; gap: 0.375rem; }
    
    .export-btn {
      padding: 0.375rem 0.625rem;
      font-family: inherit;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
    }
    
    .export-btn:hover { color: var(--text); border-color: var(--text-secondary); }
    
    /* Sections */
    .section {
      background: var(--surface);
      border-radius: 12px;
      margin-bottom: 0.5rem;
      overflow: hidden;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      cursor: pointer;
    }
    
    .section-header:hover { background: rgba(0,0,0,0.01); }
    
    .section-title {
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .badge {
      font-size: 0.6875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: var(--accent-light);
      color: var(--accent);
    }
    
    .badge.warning { background: var(--warning-light); color: var(--warning); }
    
    .chevron {
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      transition: transform 0.2s;
    }
    
    .section.open .chevron { transform: rotate(180deg); }
    
    .section-content {
      display: none;
      padding: 0 1.25rem 1.25rem;
    }
    
    .section.open .section-content { display: block; }
    
    /* Themes */
    .theme-item {
      padding: 0.875rem 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    
    .theme-item:last-child { border-bottom: none; padding-bottom: 0; }
    .theme-item:first-child { padding-top: 0; }
    
    .theme-info { flex: 1; }
    
    .theme-name {
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .sentiment-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    
    .sentiment-dot.positive { background: var(--positive); }
    .sentiment-dot.negative { background: var(--negative); }
    .sentiment-dot.mixed { background: var(--warning); }
    
    .trend-indicator { font-size: 0.75rem; }
    .trend-indicator.up { color: var(--negative); }
    .trend-indicator.down { color: var(--positive); }
    .trend-indicator.flat { color: var(--text-muted); }
    
    .theme-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }
    
    .sparkline {
      width: 60px;
      height: 24px;
      flex-shrink: 0;
    }
    
    .sparkline svg { width: 100%; height: 100%; }
    .sparkline path { fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-linecap: round; }
    .sparkline.negative path { stroke: var(--negative); }
    
    /* Clusters */
    .cluster-map {
      position: relative;
      width: 100%;
      height: 200px;
      background: var(--surface-secondary);
      border-radius: 12px;
    }
    
    .cluster-bubble {
      position: absolute;
      border-radius: 50%;
      background: var(--accent);
      opacity: 0.15;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .cluster-bubble:hover { opacity: 0.3; transform: scale(1.05); }
    
    .cluster-label {
      position: absolute;
      font-size: 0.6875rem;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
    }
    
    /* Actions */
    .action-item {
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 0.75rem;
    }
    
    .action-item:last-child { margin-bottom: 0; }
    
    .action-header {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    
    .action-title { font-size: 0.875rem; font-weight: 500; }
    
    .action-priority {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    
    .action-priority.P0 { background: var(--negative-light); color: var(--negative); }
    .action-priority.P1 { background: var(--warning-light); color: var(--warning); }
    .action-priority.P2 { background: var(--surface-secondary); color: var(--text-secondary); }
    
    .action-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
    }
    
    .action-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    
    .action-tag {
      font-size: 0.6875rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface-secondary);
      border-radius: 4px;
      color: var(--text-muted);
    }
    
    .action-export {
      margin-left: auto;
      padding: 0.375rem 0.75rem;
      font-family: inherit;
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--accent);
      background: var(--accent-light);
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .action-export:hover { background: var(--accent); color: white; }
    
    /* Sentiment */
    .sentiment-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    
    .sentiment-bar {
      flex: 1;
      height: 6px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
      display: flex;
    }
    
    .sentiment-fill { height: 100%; }
    .sentiment-fill.positive { background: var(--positive); }
    .sentiment-fill.negative { background: var(--negative); }
    
    .sentiment-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
    
    .sentiment-explanation {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }
    
    /* Risks */
    .risk-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    
    .risk-item:last-child { border-bottom: none; padding-bottom: 0; }
    .risk-item:first-child { padding-top: 0; }
    
    .risk-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 0.375rem;
      flex-shrink: 0;
    }
    
    .risk-dot.critical { background: var(--negative); }
    .risk-dot.high { background: var(--warning); }
    .risk-dot.medium { background: var(--text-muted); }
    
    .risk-text { font-size: 0.8125rem; }
    
    /* Evidence */
    .quote-item {
      padding: 0.875rem 0;
      border-bottom: 1px solid var(--border);
    }
    
    .quote-item:last-child { border-bottom: none; padding-bottom: 0; }
    .quote-item:first-child { padding-top: 0; }
    
    .quote-text {
      font-size: 0.875rem;
      font-style: italic;
    }
    
    .quote-source {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.375rem;
    }
    
    /* Follow-ups */
    .followups {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    
    .followup-btn {
      padding: 0.5rem 0.875rem;
      font-family: inherit;
      font-size: 0.8125rem;
      color: var(--accent);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .followup-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
    
    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    
    .modal-overlay.visible { display: flex; }
    
    .modal {
      background: var(--surface);
      border-radius: 20px;
      width: 100%;
      max-width: 500px;
      max-height: 85vh;
      overflow: auto;
      animation: modalIn 0.2s ease;
    }
    
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
    }
    
    .modal-title { font-size: 1rem; font-weight: 600; }
    .modal-subtitle { font-size: 0.75rem; color: var(--text-muted); }
    
    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--surface-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-content { padding: 1.5rem; }
    
    .briefing-section { margin-bottom: 1.5rem; }
    .briefing-section:last-child { margin-bottom: 0; }
    
    .briefing-section-title {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    
    .stat-card {
      background: var(--surface-secondary);
      border-radius: 10px;
      padding: 0.875rem;
      text-align: center;
    }
    
    .stat-value { font-size: 1.5rem; font-weight: 600; }
    .stat-value.negative { color: var(--negative); }
    .stat-value.positive { color: var(--positive); }
    .stat-label { font-size: 0.6875rem; color: var(--text-muted); margin-top: 0.25rem; }
    
    .issue-item {
      display: flex;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid var(--border);
    }
    
    .issue-item:last-child { border-bottom: none; }
    .issue-name { font-size: 0.875rem; }
    
    .issue-count {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--negative);
      background: var(--negative-light);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    
    .critical-item {
      background: var(--negative-light);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 0.8125rem;
    }
    
    .critical-item:last-child { margin-bottom: 0; }
    .critical-source { font-size: 0.6875rem; color: var(--negative); margin-top: 0.375rem; }
    
    .win-item {
      background: var(--positive-light);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 0.8125rem;
      font-style: italic;
    }
    
    .win-item:last-child { margin-bottom: 0; }
    
    /* Shortcuts Modal */
    .shortcuts-list { padding: 1.5rem; }
    
    .shortcut-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }
    
    .shortcut-keys { display: flex; gap: 0.25rem; }
    
    .key {
      padding: 0.25rem 0.5rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
    }
    
    /* Init Notice */
    .init-notice {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface);
      padding: 0.875rem 1.25rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
      z-index: 50;
    }
    
    .init-btn {
      padding: 0.5rem 1rem;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      color: white;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    
    footer {
      text-align: center;
      padding: 2rem 1rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    footer a { color: var(--text-secondary); text-decoration: none; }
  </style>
</head>
<body>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="logo"><span class="logo-icon">✦</span> Feedback Copilot</div>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleBriefing()" title="Morning Briefing (B)">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="toggleShortcuts()" title="Shortcuts (?)">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </button>
      </div>
    </header>
    
    <!-- Thread List -->
    <div class="threads-container" id="threadsContainer">
      <div class="threads-header" onclick="toggleThreads()">
        <span class="threads-title">
          Threads <span class="thread-count" id="threadCount">0</span>
        </span>
        <svg class="threads-toggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
      <div class="threads-list" id="threadsList"></div>
      <button class="new-thread-btn" onclick="startNewThread()">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        New Thread
      </button>
    </div>
    
    <!-- Command Box -->
    <div class="command-box">
      <div class="thread-indicator" id="threadIndicator" style="display:none;">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
        </svg>
        <span id="threadIndicatorText">Continuing thread...</span>
      </div>
      <div class="input-row">
        <input 
          type="text" 
          class="command-input" 
          id="input"
          placeholder="Ask about your feedback..."
          autocomplete="off"
        >
        <button class="submit-btn" id="submitBtn" onclick="analyze()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </button>
      </div>
      <div class="sources-row">
        <span class="source-chip active" data-source="support">Support</span>
        <span class="source-chip active" data-source="github">GitHub</span>
        <span class="source-chip active" data-source="discord">Discord</span>
        <span class="source-chip active" data-source="twitter">Twitter</span>
        <span class="source-chip active" data-source="in_app">In-App</span>
      </div>
    </div>
    
    <!-- Quick Prompts (shown when no active thread) -->
    <div class="prompts" id="prompts">
      <button class="prompt-btn" onclick="ask('What are users frustrated about?')">😤 Frustrations</button>
      <button class="prompt-btn" onclick="ask('What do users love?')">❤️ What's loved</button>
      <button class="prompt-btn" onclick="ask('What needs urgent attention?')">🚨 Urgent</button>
      <button class="prompt-btn" onclick="ask('What are the top feature requests?')">✨ Requests</button>
    </div>
    
    <!-- Thread Messages -->
    <div class="thread-messages" id="threadMessages" style="display:none;">
      <div class="thread-messages-header">Conversation</div>
      <div id="messagesList"></div>
    </div>
    
    <!-- Results -->
    <div class="results" id="results"></div>
    
    <footer>
      Built with <a href="https://developers.cloudflare.com/workers/">Workers</a>, 
      <a href="https://developers.cloudflare.com/d1/">D1</a> & 
      <a href="https://developers.cloudflare.com/workers-ai/">Workers AI</a>
      <br><span style="margin-top:0.5rem;display:inline-block;">Press <span class="key" style="font-size:0.625rem;">?</span> for shortcuts</span>
    </footer>
  </div>
  
  <!-- Morning Briefing Modal -->
  <div class="modal-overlay" id="briefingOverlay" onclick="if(event.target===this)toggleBriefing()">
    <div class="modal">
      <div class="modal-header">
        <div>
          <div class="modal-title">☀️ Morning Briefing</div>
          <div class="modal-subtitle" id="briefingDate"></div>
        </div>
        <button class="close-btn" onclick="toggleBriefing()">✕</button>
      </div>
      <div class="modal-content" id="briefingContent">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  </div>
  
  <!-- Shortcuts Modal -->
  <div class="modal-overlay" id="shortcutsOverlay" onclick="if(event.target===this)toggleShortcuts()">
    <div class="modal" style="max-width:320px;">
      <div class="modal-header">
        <div class="modal-title">⌨️ Keyboard Shortcuts</div>
        <button class="close-btn" onclick="toggleShortcuts()">✕</button>
      </div>
      <div class="shortcuts-list">
        <div class="shortcut-row"><span>Focus search</span><div class="shortcut-keys"><span class="key">⌘</span><span class="key">K</span></div></div>
        <div class="shortcut-row"><span>Toggle sources</span><div class="shortcut-keys"><span class="key">1</span>-<span class="key">5</span></div></div>
        <div class="shortcut-row"><span>Morning briefing</span><div class="shortcut-keys"><span class="key">B</span></div></div>
        <div class="shortcut-row"><span>New thread</span><div class="shortcut-keys"><span class="key">N</span></div></div>
        <div class="shortcut-row"><span>Show shortcuts</span><div class="shortcut-keys"><span class="key">?</span></div></div>
        <div class="shortcut-row"><span>Close modal</span><div class="shortcut-keys"><span class="key">Esc</span></div></div>
      </div>
    </div>
  </div>
  
  <!-- Init Notice -->
  <div class="init-notice" id="initNotice" style="display:none;">
    <span>Database needs setup</span>
    <button class="init-btn" onclick="init()">Initialize</button>
  </div>

  <script>
    // State
    let sources = ['support', 'github', 'discord', 'twitter', 'in_app'];
    let threads = []; // Array of thread objects
    let activeThreadId = null;
    let lastData = null;
    
    // Thread structure: { id, name, messages: [{q, summary, data}], createdAt }
    
    document.addEventListener('DOMContentLoaded', () => {
      loadSources();
      loadThreadsFromStorage();
      setupKeyboard();
      setupSourceChips();
      
      document.getElementById('input').addEventListener('keypress', e => {
        if (e.key === 'Enter') analyze();
      });
      
      document.getElementById('input').addEventListener('input', updateThreadIndicator);
    });
    
    function setupSourceChips() {
      document.querySelectorAll('.source-chip').forEach(chip => {
        chip.onclick = () => {
          chip.classList.toggle('active');
          const s = chip.dataset.source;
          sources = chip.classList.contains('active') 
            ? [...sources, s] 
            : sources.filter(x => x !== s);
        };
      });
    }
    
    function setupKeyboard() {
      document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') {
          if (e.key === 'Escape') e.target.blur();
          return;
        }
        
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          document.getElementById('input').focus();
        }
        
        if (e.key >= '1' && e.key <= '5') {
          const chips = document.querySelectorAll('.source-chip');
          chips[parseInt(e.key) - 1]?.click();
        }
        
        if (e.key === 'b' || e.key === 'B') toggleBriefing();
        if (e.key === 'n' || e.key === 'N') startNewThread();
        if (e.key === '?') toggleShortcuts();
        if (e.key === 'Escape') {
          document.getElementById('briefingOverlay').classList.remove('visible');
          document.getElementById('shortcutsOverlay').classList.remove('visible');
        }
      });
    }
    
    // Thread Management
    function loadThreadsFromStorage() {
      try {
        const saved = localStorage.getItem('feedbackCopilotThreads');
        if (saved) {
          threads = JSON.parse(saved);
          renderThreadList();
        }
      } catch (e) {
        console.error('Failed to load threads:', e);
      }
    }
    
    function saveThreadsToStorage() {
      try {
        localStorage.setItem('feedbackCopilotThreads', JSON.stringify(threads));
      } catch (e) {
        console.error('Failed to save threads:', e);
      }
    }
    
    function generateThreadId() {
      return 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    function generateThreadName(question) {
      // Create a short name from the first question
      const name = question.length > 35 ? question.substring(0, 35) + '...' : question;
      return name;
    }
    
    function startNewThread() {
      activeThreadId = null;
      lastData = null;
      
      document.getElementById('results').classList.remove('visible');
      document.getElementById('results').innerHTML = '';
      document.getElementById('threadMessages').style.display = 'none';
      document.getElementById('prompts').style.display = 'flex';
      document.getElementById('input').value = '';
      
      updateThreadIndicator();
      renderThreadList();
      document.getElementById('input').focus();
    }
    
    function switchToThread(threadId) {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;
      
      activeThreadId = threadId;
      
      // Render thread messages
      renderThreadMessages(thread);
      
      // Show last result if available
      if (thread.messages.length > 0) {
        const lastMessage = thread.messages[thread.messages.length - 1];
        if (lastMessage.data) {
          lastData = lastMessage.data;
          render(lastData);
          document.getElementById('results').classList.add('visible');
        }
      }
      
      document.getElementById('prompts').style.display = 'none';
      updateThreadIndicator();
      renderThreadList();
    }
    
    function deleteThread(threadId, event) {
      event.stopPropagation();
      threads = threads.filter(t => t.id !== threadId);
      saveThreadsToStorage();
      
      if (activeThreadId === threadId) {
        startNewThread();
      } else {
        renderThreadList();
      }
    }
    
    function renderThreadList() {
      const list = document.getElementById('threadsList');
      const count = document.getElementById('threadCount');
      
      count.textContent = threads.length;
      
      if (threads.length === 0) {
        list.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No threads yet. Ask a question to start!</div>';
        return;
      }
      
      list.innerHTML = threads.map(t => \`
        <div class="thread-item \${t.id === activeThreadId ? 'active' : ''}" onclick="switchToThread('\${t.id}')">
          <span class="thread-dot"></span>
          <div class="thread-info">
            <div class="thread-name">\${escapeHtml(t.name)}</div>
            <div class="thread-meta">\${t.messages.length} message\${t.messages.length !== 1 ? 's' : ''}</div>
          </div>
          <button class="thread-delete" onclick="deleteThread('\${t.id}', event)" title="Delete thread">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      \`).join('');
    }
    
    function renderThreadMessages(thread) {
      const container = document.getElementById('threadMessages');
      const list = document.getElementById('messagesList');
      
      if (thread.messages.length === 0) {
        container.style.display = 'none';
        return;
      }
      
      container.style.display = 'block';
      
      // Show all but the most recent (which is shown in results)
      const messagesToShow = thread.messages.slice(0, -1);
      
      if (messagesToShow.length === 0) {
        container.style.display = 'none';
        return;
      }
      
      list.innerHTML = messagesToShow.map(m => \`
        <div class="message-item">
          <div class="message-question">\${escapeHtml(m.q)}</div>
          <div class="message-answer">\${escapeHtml(m.summary || '')}</div>
        </div>
      \`).join('');
    }
    
    function updateThreadIndicator() {
      const indicator = document.getElementById('threadIndicator');
      const text = document.getElementById('threadIndicatorText');
      const input = document.getElementById('input').value.trim();
      
      if (activeThreadId) {
        const thread = threads.find(t => t.id === activeThreadId);
        indicator.style.display = 'flex';
        indicator.className = 'thread-indicator';
        text.textContent = 'Continuing: ' + (thread?.name || 'thread');
      } else if (input && detectIfFollowUp(input)) {
        indicator.style.display = 'flex';
        indicator.className = 'thread-indicator';
        text.textContent = 'Looks like a follow-up...';
      } else {
        indicator.style.display = 'none';
      }
    }
    
    function detectIfFollowUp(question) {
      if (!activeThreadId && threads.length === 0) return false;
      
      const q = question.toLowerCase();
      const followUpSignals = [
        'tell me more', 'more about', 'what about', 'how about',
        'which', 'why', 'elaborate', 'explain', 'specifically',
        'can you', 'could you', 'details', 'examples', 'like what',
        'such as', 'for instance', 'how severe', 'how bad', 'how many'
      ];
      
      return followUpSignals.some(signal => q.includes(signal)) || q.length < 30;
    }
    
    function toggleThreads() {
      document.getElementById('threadsContainer').classList.toggle('collapsed');
    }
    
    // Analysis
    async function loadSources() {
      try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        if (data.error || !data.length) {
          document.getElementById('initNotice').style.display = 'flex';
        }
      } catch {
        document.getElementById('initNotice').style.display = 'flex';
      }
    }
    
    async function init() {
      const btn = document.querySelector('.init-btn');
      btn.textContent = 'Setting up...';
      const res = await fetch('/api/init');
      const data = await res.json();
      if (data.success) {
        document.getElementById('initNotice').style.display = 'none';
      } else {
        btn.textContent = 'Error - Retry';
      }
    }
    
    function ask(q) {
      document.getElementById('input').value = q;
      analyze();
    }
    
    async function analyze() {
      const q = document.getElementById('input').value.trim();
      if (!q) return;
      
      const results = document.getElementById('results');
      const btn = document.getElementById('submitBtn');
      
      btn.disabled = true;
      document.getElementById('prompts').style.display = 'none';
      results.classList.add('visible');
      results.innerHTML = '<div class="loading"><div class="spinner"></div><p>Analyzing...</p></div>';
      
      // Determine thread context
      let threadContext = null;
      let currentThread = null;
      
      if (activeThreadId) {
        currentThread = threads.find(t => t.id === activeThreadId);
        if (currentThread && currentThread.messages.length > 0) {
          // Build context from previous messages
          threadContext = currentThread.messages.map(m => 
            \`Q: \${m.q}\\nA: \${m.summary}\`
          ).join('\\n\\n');
        }
      } else {
        // Check if this should be a new thread or continue most recent
        const isFollowUp = detectIfFollowUp(q);
        if (isFollowUp && threads.length > 0) {
          // Continue most recent thread
          currentThread = threads[0];
          activeThreadId = currentThread.id;
          threadContext = currentThread.messages.map(m => 
            \`Q: \${m.q}\\nA: \${m.summary}\`
          ).join('\\n\\n');
        }
      }
      
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: q, 
            sources,
            threadContext 
          })
        });
        
        lastData = await res.json();
        
        // Add to thread
        const message = { q, summary: lastData.summary, data: lastData };
        
        if (currentThread) {
          // Add to existing thread
          currentThread.messages.push(message);
        } else {
          // Create new thread
          const newThread = {
            id: generateThreadId(),
            name: generateThreadName(q),
            messages: [message],
            createdAt: new Date().toISOString()
          };
          threads.unshift(newThread);
          activeThreadId = newThread.id;
          currentThread = newThread;
        }
        
        saveThreadsToStorage();
        renderThreadList();
        renderThreadMessages(currentThread);
        render(lastData);
        
      } catch (err) {
        results.innerHTML = '<div class="loading">Something went wrong</div>';
      }
      
      btn.disabled = false;
      document.getElementById('input').value = '';
      updateThreadIndicator();
    }
    
    function render(d) {
      const results = document.getElementById('results');
      
      let html = \`
        <div class="summary-card">
          <p class="summary-text">\${d.summary || 'No summary available'}</p>
          <div class="summary-meta">
            <span>\${d.meta?.count || 0} items analyzed</span>
            <div class="export-btns">
              <button class="export-btn" onclick="copyMarkdown()">Markdown</button>
              <button class="export-btn" onclick="copySlack()">Slack</button>
            </div>
          </div>
        </div>
      \`;
      
      // Themes
      if (d.themes?.length) {
        html += \`
          <div class="section open" onclick="this.classList.toggle('open')">
            <div class="section-header">
              <span class="section-title">Key Themes <span class="badge">\${d.themes.length}</span></span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              \${d.themes.map(t => \`
                <div class="theme-item">
                  <div class="theme-info">
                    <div class="theme-name">
                      <span class="sentiment-dot \${t.sentiment || 'mixed'}"></span>
                      \${t.name}
                      <span class="trend-indicator \${t.trend || 'flat'}">\${t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'}</span>
                    </div>
                    <div class="theme-desc">\${t.description || ''}</div>
                  </div>
                  <div class="sparkline \${t.sentiment === 'negative' ? 'negative' : ''}">
                    \${renderSparkline(t.trendData)}
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      
      // Clusters
      if (d.clusters?.length) {
        html += \`
          <div class="section" onclick="this.classList.toggle('open')">
            <div class="section-header">
              <span class="section-title">Theme Clusters</span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              <div class="cluster-map">\${renderClusters(d.clusters)}</div>
            </div>
          </div>
        \`;
      }
      
      // Sentiment
      if (d.sentiment) {
        html += \`
          <div class="section" onclick="this.classList.toggle('open')">
            <div class="section-header">
              <span class="section-title">Sentiment</span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              <div class="sentiment-row">
                <div class="sentiment-bar">
                  <div class="sentiment-fill positive" style="width:\${d.sentiment.positive || 30}%"></div>
                  <div class="sentiment-fill negative" style="width:\${d.sentiment.negative || 30}%"></div>
                </div>
                <span class="sentiment-label">\${d.sentiment.overall || 'mixed'}</span>
              </div>
              <p class="sentiment-explanation">\${d.sentiment.explanation || ''}</p>
            </div>
          </div>
        \`;
      }
      
      // Actions
      if (d.actions?.length) {
        html += \`
          <div class="section open" onclick="event.stopPropagation()">
            <div class="section-header" onclick="this.parentElement.classList.toggle('open')">
              <span class="section-title">📋 Action Items <span class="badge">\${d.actions.length}</span></span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              \${d.actions.map(a => \`
                <div class="action-item">
                  <div class="action-header">
                    <span class="action-title">\${a.title}</span>
                    <span class="action-priority \${a.priority}">\${a.priority}</span>
                  </div>
                  <div class="action-desc">\${a.description}</div>
                  <div class="action-meta">
                    <span class="action-tag">\${a.type || 'task'}</span>
                    <span class="action-tag">\${a.effort || 'medium'}</span>
                    <button class="action-export" onclick="event.stopPropagation(); copyJira('\${escapeQuotes(a.title)}', '\${escapeQuotes(a.description)}', '\${a.priority}')">Copy as Jira</button>
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      
      // Risks
      if (d.risks?.length) {
        html += \`
          <div class="section" onclick="this.classList.toggle('open')">
            <div class="section-header">
              <span class="section-title">Risks <span class="badge warning">\${d.risks.length}</span></span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              \${d.risks.map(r => \`
                <div class="risk-item">
                  <span class="risk-dot \${r.urgency}"></span>
                  <span class="risk-text">\${r.signal}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      
      // Evidence
      if (d.evidence?.length) {
        html += \`
          <div class="section" onclick="this.classList.toggle('open')">
            <div class="section-header">
              <span class="section-title">Evidence</span>
              <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            <div class="section-content">
              \${d.evidence.map(e => \`
                <div class="quote-item">
                  <p class="quote-text">"\${e.quote}"</p>
                  <p class="quote-source">— \${e.source}</p>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      
      // Follow-ups
      if (d.followups?.length) {
        html += \`
          <div class="followups">
            \${d.followups.map(f => \`
              <button class="followup-btn" onclick="ask('\${escapeQuotes(f)}')">\${f}</button>
            \`).join('')}
          </div>
        \`;
      }
      
      results.innerHTML = html;
    }
    
    function renderSparkline(data) {
      if (!data || !data.length) data = [3,4,2,5,3,6,4];
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const w = 60, h = 24, p = 2;
      
      const points = data.map((v, i) => {
        const x = p + (i / (data.length - 1)) * (w - p * 2);
        const y = h - p - ((v - min) / range) * (h - p * 2);
        return \`\${x},\${y}\`;
      }).join(' L ');
      
      return \`<svg viewBox="0 0 \${w} \${h}"><path d="M \${points}"/></svg>\`;
    }
    
    function renderClusters(clusters) {
      if (!clusters?.length) return '';
      
      return clusters.map((c, i) => {
        const size = Math.max(40, Math.min(80, (c.size || 3) * 15));
        const x = c.x || (20 + i * 30);
        const y = c.y || (30 + (i % 2) * 40);
        
        return \`
          <div class="cluster-bubble" style="left:\${x}%; top:\${y}%; width:\${size}px; height:\${size}px; transform: translate(-50%, -50%);" onclick="event.stopPropagation(); ask('Tell me more about \${c.name}')"></div>
          <div class="cluster-label" style="left:\${x}%; top:calc(\${y}% + \${size/2 + 8}px); transform: translateX(-50%);">\${c.name}</div>
        \`;
      }).join('');
    }
    
    // Utilities
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    
    function escapeQuotes(str) {
      if (!str) return '';
      return str.replace(/'/g, "\\\\'").replace(/"/g, '\\\\"');
    }
    
    // Briefing
    async function toggleBriefing() {
      const overlay = document.getElementById('briefingOverlay');
      if (overlay.classList.contains('visible')) {
        overlay.classList.remove('visible');
        return;
      }
      
      overlay.classList.add('visible');
      document.getElementById('briefingDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      document.getElementById('briefingContent').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const res = await fetch('/api/briefing');
        const data = await res.json();
        renderBriefing(data);
      } catch {
        document.getElementById('briefingContent').innerHTML = '<p>Failed to load</p>';
      }
    }
    
    function renderBriefing(data) {
      const s = data.stats || {};
      document.getElementById('briefingContent').innerHTML = \`
        <div class="briefing-section">
          <div class="briefing-section-title">This Week</div>
          <div class="stat-grid">
            <div class="stat-card"><div class="stat-value">\${s.total || 0}</div><div class="stat-label">Total</div></div>
            <div class="stat-card"><div class="stat-value negative">\${s.urgent || 0}</div><div class="stat-label">Urgent</div></div>
            <div class="stat-card"><div class="stat-value">\${s.today || 0}</div><div class="stat-label">Today</div></div>
          </div>
        </div>
        <div class="briefing-section">
          <div class="briefing-section-title">Top Pain Points</div>
          \${(data.topIssues || []).map(i => \`<div class="issue-item"><span class="issue-name">\${i.product_area}</span><span class="issue-count">\${i.count}</span></div>\`).join('') || '<p style="color:var(--text-muted);font-size:0.875rem;">No major issues</p>'}
        </div>
        \${(data.criticalItems || []).length ? \`<div class="briefing-section"><div class="briefing-section-title">🚨 Critical</div>\${data.criticalItems.map(c => \`<div class="critical-item">"\${c.content}"<div class="critical-source">via \${c.source}</div></div>\`).join('')}</div>\` : ''}
        <div class="briefing-section">
          <div class="briefing-section-title">🎉 Wins</div>
          \${(data.positiveWins || []).map(w => \`<div class="win-item">"\${w.content}"</div>\`).join('') || '<p style="color:var(--text-muted);font-size:0.875rem;">Keep it up!</p>'}
        </div>
      \`;
    }
    
    function toggleShortcuts() {
      document.getElementById('shortcutsOverlay').classList.toggle('visible');
    }
    
    // Export
    async function copyMarkdown() {
      if (!lastData) return;
      const text = \`# Feedback Analysis\\n\\n## Summary\\n\${lastData.summary}\\n\\n## Themes\\n\${lastData.themes?.map(t => \`- **\${t.name}**: \${t.description}\`).join('\\n') || 'None'}\\n\\n## Actions\\n\${lastData.actions?.map(a => \`- [\${a.priority}] \${a.title}\`).join('\\n') || 'None'}\`;
      await navigator.clipboard.writeText(text);
      showToast('Copied as Markdown');
    }
    
    async function copySlack() {
      if (!lastData) return;
      const text = \`*📊 Feedback Analysis*\\n\\n*Summary:* \${lastData.summary}\\n\\n*Themes:*\\n\${lastData.themes?.map(t => \`• \${t.name}\`).join('\\n') || 'None'}\\n\\n*Actions:*\\n\${lastData.actions?.map(a => \`• [\${a.priority}] \${a.title}\`).join('\\n') || 'None'}\`;
      await navigator.clipboard.writeText(text);
      showToast('Copied for Slack');
    }
    
    async function copyJira(title, desc, priority) {
      const text = \`**Title:** \${title}\\n\\n**Priority:** \${priority}\\n\\n**Description:**\\n\${desc}\\n\\n---\\n_From Feedback Copilot_\`;
      await navigator.clipboard.writeText(text);
      showToast('Copied as Jira');
    }
    
    function showToast(msg) {
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.875rem;z-index:200;';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  </script>
</body>
</html>`;
}