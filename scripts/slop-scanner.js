const fs = require('fs');
const path = require('path');

// Target files to scan
const TARGET_FILES = [
  'apps/web/app/page.tsx',
  'apps/web/app/(student)/menu/page.tsx',
  'apps/web/app/(student)/group/page.tsx',
  'apps/web/app/(staff)/kitchen/page.tsx',
  'apps/web/app/(admin)/admin/page.tsx',
  'apps/web/styles/globals.css'
];

// Slop Vocabulary to scan
const AI_VOCABULARY = [
  'seamless', 'robust', 'powerful', 'cutting-edge', 'game-changing', 
  'unlock', 'leverage', 'delve', 'tapestry', 'revolutionize', 
  'next-generation', 'innovative', 'fast-paced world'
];

const EMOJIS = ['✨', '🎉', '⚡', '🔥', '🍲', '🥞', '🥯', '🎓', '🍱', '🗳️', '🎯', '📍', '⏰', '📅', '👋', '🏆'];

function scanFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return { error: 'File not found' };
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  return { content, lines };
}

function runScanner() {
  console.log('--- RUNNING SLOP SCANNER ---');
  
  const results = {};
  for (const file of TARGET_FILES) {
    results[file] = scanFile(file);
  }

  // Issues found container
  const detectedProblems = [];
  const codeReferences = [];
  
  // Scored breakdown categories
  let visualSlopScore = 0;
  let typographySlopScore = 0;
  let layoutSlopScore = 0;
  let copywritingSlopScore = 0;
  let missingUxStatesScore = 0;
  let designSystemInconsistencyScore = 0;
  let brandIdentityScore = 0;
  let excessiveDecorationScore = 0;

  // Let's scan Visual Genericness (Max 25 pts)
  // Gradients, Blobs, Cards, Border Radius, Shadow
  let gradientCount = 0;
  let blobCount = 0;
  let cardCount = 0;
  let radiusCount = 0;
  let shadowCount = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error) continue;
    data.lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Gradient abuse check
      const gradientMatch = line.match(/(bg-gradient-to-[r|l|t|b]|from-purple-|to-blue-|from-indigo-|bg-mesh-hero)/g);
      if (gradientMatch) {
        gradientCount += gradientMatch.length;
        if (gradientCount < 15) {
          codeReferences.push({ file, lineNum, category: 'Visual Slop', detail: `Gradient pattern: "${line.trim()}"` });
        }
      }

      // Blurred Blobs
      const blobMatch = line.match(/(blur-\[(?:80|100|60)px\]|bg-primary\/8\s+blur-|rounded-full\s+bg-accent\/10)/g);
      if (blobMatch) {
        blobCount += blobMatch.length;
        codeReferences.push({ file, lineNum, category: 'Visual Slop', detail: `Decorative blur blob: "${line.trim()}"` });
      }

      // Cardification
      const cardMatch = line.match(/(glass-card|glass-card-dark|card-hover-lift|borderWarm)/g);
      if (cardMatch) {
        cardCount += cardMatch.length;
        if (cardCount < 15) {
          codeReferences.push({ file, lineNum, category: 'Visual Slop', detail: `Generic card pattern: "${line.trim()}"` });
        }
      }

      // Border Radius
      const radiusMatch = line.match(/(rounded-3xl|rounded-\[32px\]|rounded-2xl)/g);
      if (radiusMatch) {
        radiusCount += radiusMatch.length;
        if (radiusCount < 15) {
          codeReferences.push({ file, lineNum, category: 'Visual Slop', detail: `Inflated border radius: "${line.trim()}"` });
        }
      }

      // Shadows
      const shadowMatch = line.match(/(shadow-2xl|shadow-xl|shadow-lg)/g);
      if (shadowMatch) {
        shadowCount += shadowMatch.length;
        if (shadowCount < 15) {
          codeReferences.push({ file, lineNum, category: 'Visual Slop', detail: `Arbitrary soft shadow: "${line.trim()}"` });
        }
      }
    });
  }

  // Compute Visual Slop Score (out of 25)
  if (gradientCount > 4) visualSlopScore += 6;
  else if (gradientCount > 1) visualSlopScore += 3;

  if (blobCount > 2) visualSlopScore += 6;
  else if (blobCount > 0) visualSlopScore += 3;

  if (cardCount > 15) visualSlopScore += 6;
  else if (cardCount > 5) visualSlopScore += 3;

  if (radiusCount > 10) visualSlopScore += 4;
  if (shadowCount > 8) visualSlopScore += 3;

  if (visualSlopScore > 25) visualSlopScore = 25;

  if (gradientCount > 4) detectedProblems.push(`Visual genericness: Found excessive decorative gradients (${gradientCount} matches).`);
  if (blobCount > 2) detectedProblems.push(`Visual genericness: Found statistical "AI blobs" and radial blurs (${blobCount} matches).`);
  if (cardCount > 15) detectedProblems.push(`Visual genericness: Everything packaged into shadow cards (${cardCount} card patterns).`);
  if (radiusCount > 10) detectedProblems.push(`Visual genericness: Inflated border radius values (e.g. rounded-3xl, rounded-[32px]) are used uniformly.`);

  // Let's scan Typography Genericness (Max 10 pts)
  let interFontCount = 0;
  let displayFontCount = 0;
  let boldAbuseCount = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error) continue;
    data.lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Default font search
      if (line.includes('var(--font-inter)') || line.includes("'Inter'") || line.includes('font-sans')) {
        interFontCount++;
      }
      
      // Custom display font
      if (line.includes('var(--font-outfit)') || line.includes('Outfit')) {
        displayFontCount++;
      }

      // Bold abuse
      const boldMatch = line.match(/(font-bold|font-extrabold)/g);
      if (boldMatch) {
        boldAbuseCount += boldMatch.length;
        if (boldAbuseCount < 15) {
          codeReferences.push({ file, lineNum, category: 'Typography Slop', detail: `Bold styling override: "${line.trim()}"` });
        }
      }
    });
  }

  // Compute Typography Slop Score
  if (interFontCount > 5 && displayFontCount === 0) {
    typographySlopScore += 4;
  }
  if (boldAbuseCount > 30) {
    typographySlopScore += 3;
    detectedProblems.push(`Typography: Bold and extra-bold styling used excessively (${boldAbuseCount} matches), collapsing visual contrast.`);
  }
  // Title Case check in headings
  let titleCaseHeadingCount = 0;
  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    const headings = data.content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
    headings.forEach(h => {
      const clean = h.replace(/<[^>]*>/g, '').trim();
      // If starts with capital letter and has mostly Title Case
      const words = clean.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 2) {
        const titleCased = words.every(w => /^[A-Z]/.test(w) || /^(and|or|for|to|with|in|on|at|a|an|the)$/i.test(w));
        if (titleCased) titleCaseHeadingCount++;
      }
    });
  }

  if (titleCaseHeadingCount > 4) {
    typographySlopScore += 3;
    detectedProblems.push(`Typography: Heading uniformity detected. Multiple display headings are in Title Case (${titleCaseHeadingCount} headings), creating rigid structural repetition.`);
  }

  if (typographySlopScore > 10) typographySlopScore = 10;

  // Let's scan Layout Repetition (Max 15 pts)
  let gridCloningCount = 0;
  let centeredHeroCount = 0;
  let symmetryCount = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    data.lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Grid clones
      if (line.includes('grid-cols-3') || line.includes('md:grid-cols-3')) {
        gridCloningCount++;
        codeReferences.push({ file, lineNum, category: 'Layout Slop', detail: `3-column grid layout: "${line.trim()}"` });
      }

      // Hero templates
      if (line.includes('bg-mesh-hero') || line.includes('floating decorative blobs')) {
        centeredHeroCount++;
      }

      // Symmetry
      const symmetryMatch = line.match(/(text-center|justify-center|items-center)/g);
      if (symmetryMatch) {
        symmetryCount += symmetryMatch.length;
      }
    });
  }

  if (gridCloningCount >= 3) {
    layoutSlopScore += 5;
    detectedProblems.push(`Layout: Feature grid cloning. Multiple identical 3-column structures found.`);
  }
  if (centeredHeroCount > 0) {
    layoutSlopScore += 5;
    detectedProblems.push(`Layout: Hero Section uses standard centered layout with gradient background and floating mockups.`);
  }
  if (symmetryCount > 40) {
    layoutSlopScore += 5;
    detectedProblems.push(`Layout: Excessive symmetry. Large percentage of blocks are centered, leading to template fatigue.`);
  }

  if (layoutSlopScore > 15) layoutSlopScore = 15;

  // Let's scan Copywriting Slop (Max 15 pts)
  let vocabCount = 0;
  let emojiCount = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    data.lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Scan vocabulary words
      AI_VOCABULARY.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = line.match(regex);
        if (matches) {
          vocabCount += matches.length;
          codeReferences.push({ file, lineNum, category: 'Copywriting Slop', detail: `AI Vocabulary term "${word}": "${line.trim()}"` });
        }
      });

      // Emoji count
      EMOJIS.forEach(emoji => {
        const matches = line.match(new RegExp(emoji, 'g'));
        if (matches) {
          emojiCount += matches.length;
        }
      });
    });
  }

  // Compute Copywriting Slop Score
  if (vocabCount > 5) copywritingSlopScore += 8;
  else if (vocabCount > 1) copywritingSlopScore += 4;

  if (emojiCount > 30) copywritingSlopScore += 4;
  else if (emojiCount > 10) copywritingSlopScore += 2;

  // Check sentence pattern / heading pattern
  // E.g. "personalized greeting", "Welcome screen", "hacked", "finally hacked"
  let greetingRepetition = 0;
  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    const matches = data.content.match(/(finally hacked|hacked)/gi) || [];
    greetingRepetition += matches.length;
  }
  if (greetingRepetition > 1) {
    copywritingSlopScore += 3;
    detectedProblems.push(`Copywriting: Cadence repetition and phrase recycling. Found multiple matches of "${greetingRepetition} hacked/finally hacked" taglines.`);
  }

  if (copywritingSlopScore > 15) copywritingSlopScore = 15;

  if (vocabCount > 0) {
    detectedProblems.push(`Copywriting: Found ${vocabCount} generic AI buzzwords (e.g. seamless, robust, powerful, game-changing).`);
  }
  if (emojiCount > 30) {
    detectedProblems.push(`Copywriting: Emoji spam detected with ${emojiCount} matches.`);
  }

  // Let's scan Missing UX States (Max 10 pts)
  let hoverStateMatches = 0;
  let focusStateMatches = 0;
  let activeStateMatches = 0;
  let disabledStateMatches = 0;
  let loadingStateMatches = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error) continue;
    data.lines.forEach(line => {
      if (line.includes('hover:')) hoverStateMatches++;
      if (line.includes('focus:') || line.includes('focus-ring')) focusStateMatches++;
      if (line.includes('active:')) activeStateMatches++;
      if (line.includes('disabled:')) disabledStateMatches++;
      if (line.includes('loading') || line.includes('isLoading') || line.includes('Skeleton')) loadingStateMatches++;
    });
  }

  // In many templates, we have hover states but lack focus and active states
  if (focusStateMatches === 0 || focusStateMatches < 5) {
    missingUxStatesScore += 4;
    detectedProblems.push(`UX States: Missing keyboard focus rings on inputs and buttons.`);
  }
  if (activeStateMatches === 0 || activeStateMatches < 3) {
    missingUxStatesScore += 3;
    detectedProblems.push(`UX States: Missing interactive active/pressed animation triggers on action clicks.`);
  }
  if (loadingStateMatches === 0) {
    missingUxStatesScore += 3;
    detectedProblems.push(`UX States: Missing system loading transition UI or skeleton modules for network requests.`);
  }

  if (missingUxStatesScore > 10) missingUxStatesScore = 10;

  // Let's scan Design System Inconsistency (Max 10 pts)
  let inlineSpacers = 0;
  let inlineColors = 0;
  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    data.lines.forEach(line => {
      // Find hardcoded values that bypass packages/ui-tokens
      if (line.match(/(p-3\.5|py-3\.5|px-8|gap-12|h-\[500px\])/)) {
        inlineSpacers++;
      }
      if (line.match(/(bg-slate-|text-gray-|border-slate-|text-slate-)/)) {
        inlineColors++;
      }
    });
  }

  if (inlineSpacers > 5) {
    designSystemInconsistencyScore += 5;
    detectedProblems.push(`Design System: Inconsistent spacing tokens. Code bypasses core tokens using arbitrary utilities (${inlineSpacers} instances).`);
  }
  if (inlineColors > 20) {
    designSystemInconsistencyScore += 5;
    detectedProblems.push(`Design System: Hardcoded default slate/gray utility classes are used directly instead of semantic colors (${inlineColors} instances).`);
  }

  if (designSystemInconsistencyScore > 10) designSystemInconsistencyScore = 10;

  // Lack of Brand Identity (Max 10 pts)
  let generalClaims = 0;
  let SpecificUniversityRef = false;
  let doubleEntryLedgerRef = false;

  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    if (data.content.includes('Chandigarh University') || data.content.includes('Mohali')) {
      SpecificUniversityRef = true;
    }
    if (data.content.includes('ledger') || data.content.includes('balance') || data.content.includes('wallet')) {
      doubleEntryLedgerRef = true;
    }
    data.lines.forEach(line => {
      if (line.match(/(decide what you eat|college food shouldn't be|campuseats-monorepo)/gi)) {
        generalClaims++;
      }
    });
  }

  if (!SpecificUniversityRef || generalClaims > 2) {
    brandIdentityScore += 5;
    detectedProblems.push(`Brand Identity: Marketing copy relies on general SaaS/startup claims instead of localized, specific product identity.`);
  }
  if (!doubleEntryLedgerRef) {
    brandIdentityScore += 5;
    detectedProblems.push(`Brand Identity: Lacks specific representation of the student wallet transaction ledger.`);
  }
  if (brandIdentityScore > 10) brandIdentityScore = 10;

  // Excessive Decoration (Max 5)
  let floatAnimationMatches = 0;
  let decorationEmojis = 0;

  for (const [file, data] of Object.entries(results)) {
    if (data.error || file.endsWith('.css')) continue;
    data.lines.forEach(line => {
      if (line.includes('animate-float') || line.includes('animate-pulse-glow')) {
        floatAnimationMatches++;
      }
      if (line.match(/[✨🎉⚡🔥] [a-zA-Z]/)) {
        decorationEmojis++;
      }
    });
  }

  if (floatAnimationMatches > 1) {
    excessiveDecorationScore += 3;
  }
  if (decorationEmojis > 3) {
    excessiveDecorationScore += 2;
  }

  if (excessiveDecorationScore > 5) excessiveDecorationScore = 5;
  if (floatAnimationMatches > 1) {
    detectedProblems.push(`Excessive Decoration: Multiple floating animation decorations and gradient pulse effects exist purely as visual ornaments.`);
  }

  // Calculate Overall Slop Score
  const totalScore = visualSlopScore + typographySlopScore + layoutSlopScore + copywritingSlopScore + missingUxStatesScore + designSystemInconsistencyScore + brandIdentityScore + excessiveDecorationScore;
  
  let classification = '';
  if (totalScore <= 20) classification = 'Distinct';
  else if (totalScore <= 40) classification = 'Slightly Generic';
  else if (totalScore <= 60) classification = 'AI-Looking';
  else if (totalScore <= 80) classification = 'Heavy Slop';
  else classification = 'Template Collapse';

  // Generate Report Markdown content
  const report = `# Slop Scan Report - CampusEat

## 1. Slop Score
- Visual Slop: ${visualSlopScore}/25
- Typography Slop: ${typographySlopScore}/10
- Layout Slop: ${layoutSlopScore}/15
- Copywriting Slop: ${copywritingSlopScore}/15
- UX Slop (Missing States): ${missingUxStatesScore}/10
- Design System Consistency: ${designSystemInconsistencyScore}/10
- Brand Identity Presence: ${brandIdentityScore}/10
- Decorative Elements: ${excessiveDecorationScore}/5

### Overall Score: **${totalScore}/100** → **${classification}**

---

## 2. Detected Problems
${detectedProblems.map(p => `- ${p}`).join('\n')}

---

## 3. Exact Code References
${codeReferences.map(ref => `- [\`${path.basename(ref.file)}:L${ref.lineNum}\`](file:///${path.resolve(process.cwd(), ref.file).replace(/\\/g, '/')}#L${ref.lineNum}): (${ref.category}) - ${ref.detail}`).join('\n')}

---

## 4. Refactor Instructions

### Issue: Gradient and Floating Blob Abuse
- **Why it feels generic**: The landing page uses floating glowing blobs (\`animate-float\`) and primary-to-orange background mesh gradients that mimic cookie-cutter tech-builder templates.
- **Visual Principle violated**: Composition and visual contrast are replaced with simple ambient color decorations.
- **Fix Recommendation**: Remove decorative blobs. Create clear white, slate, and brand boundaries. Use typography size variation to establish focus.
- **Priority**: High

### Issue: AI-Vocabulary & Copywriting Genericness
- **Why it feels generic**: The use of words like "seamless," "finally hacked," "robust," and decorative emojis is typical of unopinionated ChatGPT content.
- **Visual Principle violated**: Narrative focus and content specificity.
- **Fix Recommendation**: Replace general claims with localized campus delivery specifics. Focus on Chandigarh University blocks, short class-interval timing restrictions, and the Double-Entry Wallet system.
- **Priority**: High

### Issue: Typography & Bold Uniformity
- **Why it feels generic**: Using standard \`Inter\` display and bold headings makes the interface look like a stock library install.
- **Visual Principle violated**: Typographic contrast and character hierarchy.
- **Fix Recommendation**: Introduce a display font (e.g. \`Outfit\`) in headers. Mix Sentence Case and Title Case headers. Create intentional weight pairing.
- **Priority**: Medium

### Issue: Layout Repetition and Symmetry
- **Why it feels generic**: Scrolling feels predictable because of standard symmetrical 3-column layouts and centering.
- **Visual Principle violated**: Visual tension and rhythm.
- **Fix Recommendation**: Use asymmetric grid layouts, group information with varied content densities, and allow sections to breathe using space.
- **Priority**: Medium
`;

  fs.writeFileSync(path.resolve(process.cwd(), 'slop-report.md'), report, 'utf8');
  console.log('--- SLOP SCAN COMPLETED: REPORT WRITTEN TO slop-report.md ---');
  console.log(`TOTAL SCORE: ${totalScore}/100 (${classification})`);
}

runScanner();
