/**
 * Financial Freedom Outcomes Calculator
 * Compares Plan 1 (Direct Invest) vs Plan 2 (Whole Life + EPIG Borrowing)
 *
 * MODEL CONVENTIONS (v3):
 * PLAN 1 — Direct Invest: contributions grow in EPIG; after-tax capital splits
 *   70% annuitized for income / 30% liquid. Legacy = the liquid fund.
 * PLAN 2 — Whole Life + EPIG:
 *   1. Accumulation: premiums build tax-free cash value inside the policy.
 *      Loans are taken against the cash value and invested in EPIG. EPIG
 *      compounds on the full borrowed amount; the policy loan capitalizes
 *      interest (principal + interest) and is repaid at the end from the EPIG
 *      proceeds. What remains outside the policy is the Net EPIG.
 *   2. Income: 100% of Net EPIG is annuitized at the Perpetual Income Rate — a
 *      life annuity that pays for life and NEVER lapses. The cash value is
 *      never annuitized or borrowed against for income.
 *   3. Liquidity (while alive) = the policy cash value (tax-free, accessible).
 *   4. Legacy (at death) = the death benefit (DB = Cash Value + Net Amount at
 *      Risk). Accumulation loans were already repaid, so nothing is deducted.
 *      The annuitized Net EPIG is consumed by the life annuity.
 * There is no income-phase policy loan, so Plan 2 cannot lapse. Plan 2 usually
 * trades some income vs Plan 1 in exchange for the death benefit + tax-free CV.
 */

// ===================================
// STATE MANAGEMENT
// ===================================

const calculatorState = {
    inputs: {},
    results: {},
    yearlyData: [],
    charts: {
        liquidity: null,
        components: null
    }
};

// ===================================
// INITIALIZATION
// ===================================

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCalculator);
} else {
    // DOM already loaded
    initializeCalculator();
}

function initializeCalculator() {
    // Setup event listeners
    setupInputListeners();
    setupActionButtons();
    setupModalHandlers();
    
    // Load from URL parameters if present
    loadFromURLParameters();
    
    // Initialize MEC slider display
    updateSliderValue();
    
    console.log('Calculator initialized successfully');
}

// ===================================
// INPUT LISTENERS
// ===================================

function setupInputListeners() {
    // Tax rate dropdown
    const taxRateSelect = document.getElementById('taxRate');
    const customTaxRate = document.getElementById('customTaxRate');
    
    taxRateSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customTaxRate.style.display = 'block';
        } else {
            customTaxRate.style.display = 'none';
        }
    });
    
    // Real-time validation on inputs
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('blur', validateInputs);
    });

    // Live recalculation: once results are visible, recompute as the user
    // changes any assumption (growth rates, contributions, etc.) instead of
    // requiring another "Calculate" click. Debounced so slider/typing is smooth.
    const recalcIds = [
        'currentAge', 'timeHorizon', 'annualContribution', 'contributionTiming',
        'directCAGR', 'perpetualRate', 'taxRate', 'customTaxRate',
        'cvGrowthRate', 'borrowPercent', 'loanRate', 'deathBenefit'
    ];
    let recalcTimer = null;
    const liveRecalc = () => {
        const results = document.getElementById('resultsContainer');
        // Wait for the first explicit "Calculate" before auto-updating.
        if (!results || results.style.display === 'none') return;
        clearTimeout(recalcTimer);
        recalcTimer = setTimeout(calculate, 250);
    };
    recalcIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', liveRecalc);
            el.addEventListener('change', liveRecalc);
        }
    });
}

// ===================================
// ACTION BUTTONS
// ===================================

function setupActionButtons() {
    const calculateBtn = document.getElementById('calculateBtn');
    const downloadBtn = document.getElementById('downloadCSV');
    const shareLinkBtn = document.getElementById('shareLink');
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Calculate button clicked!');
            calculate();
        });
        console.log('Calculate button listener attached');
    } else {
        console.error('Calculate button not found');
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCSV);
    }
    
    if (shareLinkBtn) {
        shareLinkBtn.addEventListener('click', shareLink);
    }
}

// ===================================
// INPUT GATHERING
// ===================================

function gatherInputs() {
    // Helper function to safely get element value
    const safeGetValue = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element '${id}' not found, using default: ${defaultValue}`);
            return defaultValue;
        }
        return element.value;
    };
    
    // Helper function to safely check checkbox
    const safeGetChecked = (id, defaultValue = false) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Checkbox '${id}' not found, using default: ${defaultValue}`);
            return defaultValue;
        }
        return element.checked;
    };
    
    // Get tax rate safely
    const taxRateSelect = document.getElementById('taxRate');
    let taxRate = 25; // default
    if (taxRateSelect) {
        taxRate = parseFloat(taxRateSelect.value);
        if (taxRateSelect.value === 'custom') {
            taxRate = parseFloat(safeGetValue('customTaxRate', '25')) || 25;
        }
    } else {
        console.warn('taxRate element not found, using default: 25');
    }
    
    // Get contribution timing (select dropdown, not checkbox in index.html)
    const contributionTimingSelect = document.getElementById('contributionTiming');
    let contributionTiming = 'end';
    if (contributionTimingSelect) {
        contributionTiming = contributionTimingSelect.value; // 'start' or 'end'
    } else {
        console.warn('contributionTiming element not found, using default: end');
    }
    
    return {
        currentAge: parseInt(safeGetValue('currentAge', '51')) || 51,
        timeHorizon: parseInt(safeGetValue('timeHorizon', '10')) || 10,
        annualContribution: parseFloat(safeGetValue('annualContribution', '50000')) || 50000,
        contributionTiming: contributionTiming,
        
        // Plan 1
        directCAGR: parseFloat(safeGetValue('directCAGR', '17')) || 17,
        taxRate: taxRate,
        perpetualRate: parseFloat(safeGetValue('perpetualRate', '7')) || 7,
        
        // Plan 2
        cvGrowthRate: parseFloat(safeGetValue('cvGrowthRate', '4')) || 4,
        borrowPercent: parseFloat(safeGetValue('borrowPercent', '90')) || 90,
        loanRate: parseFloat(safeGetValue('loanRate', '6')) || 6,
        deathBenefit: parseFloat(safeGetValue('deathBenefit', '750000')) || 750000
    };
}

// ===================================
// VALIDATION
// ===================================

function validateInputs() {
    const inputs = gatherInputs();
    const warnings = [];
    
    // Check for negative values
    for (const [key, value] of Object.entries(inputs)) {
        if (typeof value === 'number' && value < 0) {
            warnings.push(`⚠️ ${formatLabel(key)} cannot be negative`);
        }
    }
    
    // Warn if borrow percent is too high
    if (inputs.borrowPercent > 95) {
        warnings.push(`⚠️ Borrow % above 95% may not be realistic for policy lending`);
    }

    // Compliance guardrail: flag growth-rate assumptions above long-run equity averages
    if (inputs.directCAGR > 10) {
        warnings.push(`⚠️ A growth rate above 10% is above long-run broad-equity averages — treat as a stress-test, not a plan.`);
    }
    
    // Warn if loan balance might exceed 50% of cash value (simplified check)
    const estimatedLoanBalance = inputs.annualContribution * inputs.timeHorizon * (inputs.borrowPercent / 100);
    const estimatedCashValue = inputs.annualContribution * inputs.timeHorizon * (1 + inputs.cvGrowthRate / 100);
    
    if (estimatedLoanBalance > estimatedCashValue * 0.5) {
        warnings.push(`⚠️ Estimated loan balance may exceed 50% of cash value, increasing lapse risk`);
    }
    
    // Display warnings
    const warningContainer = document.getElementById('warningBox');
    if (warningContainer) {
        warningContainer.innerHTML = '';
        
        if (warnings.length > 0) {
            warningContainer.style.display = 'block';
            warnings.forEach(warning => {
                const div = document.createElement('div');
                div.className = 'warning-item';
                div.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${warning}</span>`;
                warningContainer.appendChild(div);
            });
        } else {
            warningContainer.style.display = 'none';
        }
    }
    
    return warnings.length === 0;
}

function formatLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// ===================================
// MAIN CALCULATION
// ===================================

function calculate() {
    try {
        console.log('Calculate function called!');
        
        // Gather and validate inputs
        const inputs = gatherInputs();
        calculatorState.inputs = inputs;
        
        console.log('Inputs gathered:', inputs);
        
        validateInputs();
        
        // Calculate both plans
        const plan1Results = calculatePlan1(inputs);
        const plan2Results = calculatePlan2(inputs);
        
        console.log('Plan 1 results:', plan1Results);
        console.log('Plan 2 results:', plan2Results);
        
        // Store results
        calculatorState.results = {
            plan1: plan1Results,
            plan2: plan2Results
        };
        
        // Create results HTML structure if it doesn't exist
        createResultsStructure();
        
        // Display results
        displayResults(plan1Results, plan2Results);
        
        console.log('Results displayed successfully');
    } catch (error) {
        console.error('Error in calculate function:', error);
        alert('An error occurred while calculating. Please check the console for details.');
    }
}

// ===================================
// PLAN 1: DIRECT INVEST
// ===================================

function calculatePlan1(inputs) {
    const { timeHorizon, annualContribution, directCAGR, taxRate, perpetualRate, contributionTiming } = inputs;
    
    let portfolioValue = 0;
    const yearlyData = [];
    
    for (let year = 1; year <= timeHorizon; year++) {
        // Contribution timing
        if (contributionTiming === 'start') {
            portfolioValue += annualContribution;
            portfolioValue *= (1 + directCAGR / 100);
        } else {
            portfolioValue *= (1 + directCAGR / 100);
            portfolioValue += annualContribution;
        }
        
        yearlyData.push({
            year,
            contribution: annualContribution,
            portfolioValue: portfolioValue
        });
    }
    
    // Calculate gains and tax
    const totalContributed = annualContribution * timeHorizon;
    const gains = portfolioValue - totalContributed;
    const taxOnGains = gains * (taxRate / 100);
    const afterTaxCapital = portfolioValue - taxOnGains;
    
    // 70/30 split: 70% annuitized, 30% remains liquid
    const annuitizedAmount = afterTaxCapital * 0.70;
    const liquidityFund = afterTaxCapital * 0.30;
    
    // Perpetual income from 70% annuitized portion
    const perpetualIncome = annuitizedAmount * (perpetualRate / 100);
    
    // Liquidity (30% liquid fund)
    const liquidity = liquidityFund;
    
    // Legacy: heirs receive the liquidity fund at death (the annuitized 70%
    // is consumed by the life annuity — worth $0 at death, same convention
    // applied to Plan 2's annuitized capital). There is no insurance death
    // benefit in Plan 1, so legacy = the liquid fund itself.
    const netLegacy = liquidityFund;
    
    return {
        yearlyData,
        portfolioValue,
        totalContributed,
        gains,
        taxOnGains,
        afterTaxCapital,
        annuitizedAmount,     // NEW: 70% annuitized
        liquidityFund,        // NEW: 30% liquid
        perpetualIncome,
        liquidity,
        netLegacy
    };
}

// ===================================
// PLAN 2: WHOLE LIFE + EPIG
// ===================================

function calculatePlan2(inputs) {
    const { 
        timeHorizon, annualContribution, cvGrowthRate, borrowPercent, 
        loanRate, directCAGR, deathBenefit, contributionTiming, perpetualRate 
    } = inputs;
    
    let cashValue = 0;
    let epigValue = 0;
    let loanBalance = 0;
    let cumulativeInterest = 0; // Track total interest paid/accrued
    const yearlyData = [];
    
    for (let year = 1; year <= timeHorizon; year++) {
        // Premium payment
        const premium = annualContribution;
        
        // Cash value growth
        if (contributionTiming === 'start') {
            cashValue += premium;
            cashValue *= (1 + cvGrowthRate / 100);
        } else {
            cashValue *= (1 + cvGrowthRate / 100);
            cashValue += premium;
        }
        
        // Borrow amount (as % of premium), invested in EPIG
        const borrowAmount = premium * (borrowPercent / 100);

        // Policy loan capitalizes interest, paid back at the end from EPIG.
        // WASH-LOAN (non-direct-recognition): the borrowed cash value keeps
        // earning the policy's credited rate, so the loan's NET cost is
        // (loan rate − cash value growth rate). With loan 6% and CV 4% the net
        // drag is ~2%, not the full 6%.
        const netLoanRate = Math.max(0, (loanRate - cvGrowthRate) / 100);
        const interestPayment = loanBalance * netLoanRate;
        cumulativeInterest += interestPayment;
        loanBalance = loanBalance * (1 + netLoanRate) + borrowAmount;

        // EPIG investment growth — compounds on the FULL borrowed amount at the
        // EPIG CAGR (interest is not skimmed off; it is settled at the end when
        // the loan is repaid from EPIG).
        if (contributionTiming === 'start') {
            epigValue += borrowAmount;
            epigValue *= (1 + directCAGR / 100);
        } else {
            epigValue *= (1 + directCAGR / 100);
            epigValue += borrowAmount;
        }

        yearlyData.push({
            year,
            funding: premium,
            borrowed: borrowAmount,
            loanBalance,
            interestPayment,
            cumulativeInterest,
            epigValue,
            cashValue
        });
    }

    // Calculate final metrics
    const totalPremiumsPaid = annualContribution * timeHorizon;

    // EPIG gains and tax. Basis = borrowed amounts invested. The loan interest
    // is DEDUCTIBLE against the EPIG gain (investment-interest expense), so the
    // taxable gain is the true economic gain net of borrowing cost:
    //   taxable = (epigValue − totalBorrowed) − loanInterest = epigValue − loanBalance
    const totalBorrowed = annualContribution * timeHorizon * (borrowPercent / 100);
    const epigGains = epigValue - totalBorrowed;
    const loanInterest = Math.max(0, loanBalance - totalBorrowed); // net interest, deductible
    const taxableGain = Math.max(0, epigGains - loanInterest);
    const taxOnEPIGGains = taxableGain * (inputs.taxRate / 100);
    const epigAfterTax = epigValue - taxOnEPIGGains;

    // Net value OUTSIDE the policy after the loan (principal + capitalized
    // interest) is repaid from the EPIG proceeds. This is the only pool that
    // gets annuitized for income.
    const netEPIGAfterLoanPayoff = Math.max(0, epigAfterTax - loanBalance);
    // If EPIG can't cover the loan, the shortfall is settled from cash value
    // (reducing CV and death benefit). Under sensible spreads this is $0.
    const cvShortfall = Math.max(0, loanBalance - epigAfterTax);
    const effectiveCashValue = Math.max(0, cashValue - cvShortfall);

    // INCOME: 100% of the Net EPIG (outside the policy) is annuitized at the
    // perpetual rate — a life annuity that pays for life and never lapses.
    // The cash value is NOT annuitized and is NOT borrowed against for income;
    // it stays inside the policy as tax-free liquidity and the death benefit.
    const annuitizableAmount = netEPIGAfterLoanPayoff;
    const perpetualIncome = annuitizableAmount * (perpetualRate / 100);

    // Liquidity while alive = the policy cash value (accessible, tax-free).
    const totalLiquidity = effectiveCashValue;

    // Legacy at death = the death benefit (which already INCLUDES cash value).
    // Loans were repaid during accumulation, so nothing is deducted here.
    const grossDeathBenefit = deathBenefit;
    const netDeathBenefit = Math.max(0, deathBenefit - cvShortfall);
    const netLegacy = netDeathBenefit;

    return {
        yearlyData,
        cashValue,
        effectiveCashValue,  // CV after covering any EPIG loan shortfall
        cvShortfall,
        epigValue,
        epigAfterInterest: epigValue, // retained for display compatibility
        epigAfterTax,       // EPIG after tax
        cumulativeInterest, // Total interest capitalized over the horizon
        taxOnEPIGGains,     // Tax on EPIG gains
        loanBalance,        // Loan principal + capitalized interest at payoff
        totalPremiumsPaid,
        epigGains,
        netEPIGAfterLoanPayoff,
        annuitizableAmount,  // 100% of Net EPIG (annuitized for income)
        totalLiquidity,
        perpetualIncome,
        grossDeathBenefit,
        netDeathBenefit,
        netLegacy
    };
}

// ===================================
// CREATE RESULTS STRUCTURE
// ===================================

function createResultsStructure() {
    console.log('=== createResultsStructure CALLED ===');
    
    // Check if index.html structure exists (resultsPlaceholder + resultsContainer)
    const resultsPlaceholder = document.getElementById('resultsPlaceholder');
    const resultsContainer = document.getElementById('resultsContainer');
    
    if (resultsPlaceholder && resultsContainer) {
        console.log('Using existing index.html results structure');
        // Hide placeholder, show container
        resultsPlaceholder.style.display = 'none';
        resultsContainer.style.display = 'block';
        console.log('=== Results structure ready (index.html) ===');
        return;
    }
    
    // Fallback: Look for resultsSection (calculator.html standalone)
    const resultsSection = document.getElementById('resultsSection');
    console.log('resultsSection found:', !!resultsSection);
    
    // Check if already created
    if (document.getElementById('plan1Income')) {
        console.log('Results structure already exists (plan1Income found)');
        return;
    }
    
    if (!resultsSection) {
        console.error('No results container found (need resultsPlaceholder+resultsContainer or resultsSection)');
        return;
    }
    
    console.log('Creating new results structure in resultsSection...');
    
    // Create results HTML structure
    resultsSection.innerHTML = `
        <div class="results-dashboard">
            <h3 class="results-title">Income • Liquidity • Legacy Scorecard</h3>
            <p style="text-align: center; color: #E0A930; font-size: 16px; font-weight: 600; margin: -10px 0 20px 0;">
                <i class="fas fa-calendar-check"></i> Year <span id="resultsYear">10</span> Results (End of Contribution Period)
            </p>
            
            <!-- Income Comparison -->
            <div class="comparison-row">
                <div class="comparison-label">
                    <i class="fas fa-dollar-sign"></i> Perpetual Annual Income
                </div>
                <div class="comparison-values">
                    <div class="value-box plan1-box">
                        <div class="plan-label">Plan 1</div>
                        <div class="value" id="plan1Income">$0</div>
                    </div>
                    <div class="value-box plan2-box">
                        <div class="plan-label">Plan 2</div>
                        <div class="value" id="plan2Income">$0</div>
                    </div>
                </div>
            </div>
            
            <!-- Liquidity Comparison -->
            <div class="comparison-row">
                <div class="comparison-label">
                    <i class="fas fa-hand-holding-usd"></i> Liquidity (Year <span id="componentYear">10</span>)
                </div>
                <div class="comparison-values">
                    <div class="value-box plan1-box">
                        <div class="plan-label">Plan 1</div>
                        <div class="value" id="plan1Liquidity">$0</div>
                    </div>
                    <div class="value-box plan2-box">
                        <div class="plan-label">Plan 2</div>
                        <div class="value" id="plan2Liquidity">$0</div>
                    </div>
                </div>
            </div>
            
            <!-- Legacy Comparison -->
            <div class="comparison-row">
                <div class="comparison-label">
                    <i class="fas fa-shield-alt"></i> Death Benefit / Legacy (Year <span id="legacyYear">10</span>)
                </div>
                <div class="comparison-values">
                    <div class="value-box plan1-box">
                        <div class="plan-label">Plan 1</div>
                        <div class="value" id="plan1Legacy">$0</div>
                    </div>
                    <div class="value-box plan2-box">
                        <div class="plan-label">Plan 2</div>
                        <div class="value" id="plan2Legacy">$0</div>
                    </div>
                </div>
            </div>
            
            <!-- Additional Details -->
            <div class="details-section">
                <div class="details-column">
                    <h4>Plan 1: Direct Investment</h4>
                    <div class="detail-row">
                        <span>After-Tax Capital:</span>
                        <span id="plan1AfterTax">$0</span>
                    </div>
                    <div class="detail-row">
                        <span>Total Contributed:</span>
                        <span id="plan1Contributed">$0</span>
                    </div>
                </div>
                <div class="details-column">
                    <h4>Plan 2: Whole Life + EPIG</h4>
                    <div class="detail-row">
                        <span>Policy Cash Value:</span>
                        <span id="plan2CashValue">$0</span>
                    </div>
                    <div class="detail-row">
                        <span>Net EPIG After Payoff:</span>
                        <span id="plan2EPIG">$0</span>
                    </div>
                    <div class="detail-row">
                        <span>Gross Death Benefit:</span>
                        <span id="plan2GrossDB">$0</span>
                    </div>
                    <div class="detail-row">
                        <span>Total Premiums Paid:</span>
                        <span id="plan2Premiums">$0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Charts Section -->
        <div class="charts-section">
            <div class="chart-container">
                <h4>Liquidity Growth Over Time</h4>
                <canvas id="liquidityChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h4>Plan 2 Components at Year <span id="componentYearChart">10</span></h4>
                <canvas id="componentsChart"></canvas>
            </div>
        </div>
        
        <!-- Year-by-Year Table -->
        <div class="table-section">
            <div class="table-header">
                <h4>Year-by-Year Breakdown (Plan 2)</h4>
                <div class="table-actions">
                    <button id="tableToggle" class="btn-table-toggle">
                        <i class="fas fa-table"></i> Show Table
                    </button>
                    <button id="downloadCSV" class="btn-download">
                        <i class="fas fa-download"></i> Download CSV
                    </button>
                    <button id="shareLink" class="btn-share-link">
                        <i class="fas fa-link"></i> Share Link
                    </button>
                </div>
            </div>
            <div id="yearTableContainer" class="year-table-container" style="display: none;">
                <table id="yearTable" class="year-table">
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Annual Funding</th>
                            <th>Borrowed Amount</th>
                            <th>Total Loan Balance</th>
                            <th>Interest Payment</th>
                            <th>Cumulative Interest</th>
                            <th>EPIG Portfolio Value</th>
                            <th>Policy Cash Value</th>
                        </tr>
                    </thead>
                    <tbody id="yearTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Re-attach event listeners for new buttons
    setupTableButtons();
    console.log('=== Results structure CREATED successfully ===');
}

// ===================================
// TABLE BUTTON HANDLERS
// ===================================

function setupTableButtons() {
    // Removed Download CSV and Share Link buttons
    // No buttons to set up anymore
}

// ===================================
// DISPLAY RESULTS
// ===================================

function displayResults(plan1, plan2) {
    console.log('=== displayResults CALLED ===');
    console.log('Plan 1 perpetual income:', plan1.perpetualIncome);
    console.log('Plan 2 perpetual income:', plan2.perpetualIncome);
    
    // Null-safe setter: a missing element must not abort the remaining fields
    // (the results markup differs between index.html and calculator.html)
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(value);
        else console.warn(`Result element '${id}' not found — skipped`);
    };

    // Project legacy to a TYPICAL DEATH AGE (~80) rather than showing the
    // end-of-contribution value (a young age), which understates the legacy.
    // Plan 1 legacy = liquidity fund grown at the after-tax bond rate.
    // Plan 2 legacy = death benefit grown via the same DB tiers the long-term
    // table uses (3.00% / 2.76% / 2.93%).
    const inp = calculatorState.inputs || {};
    const contribEndAge = (inp.currentAge || 0) + (inp.timeHorizon || 0);
    const deathAge = Math.max(80, contribEndAge);
    const yearsToDeath = Math.max(0, deathAge - contribEndAge);
    const afterTaxBond = 5 * (1 - (inp.taxRate || 0) / 100);
    const dbTiers = [3.00, 2.76, 2.93];
    const cvTiers = [5.48, 5.24, 4.61];
    const projectTier = (start, n, R) => {
        if (n <= 0) return start;
        if (n <= 10) return start * Math.pow(1 + R[0] / 100, n);
        const a = start * Math.pow(1 + R[0] / 100, 10);
        if (n <= 20) return a * Math.pow(1 + R[1] / 100, n - 10);
        return a * Math.pow(1 + R[1] / 100, 10) * Math.pow(1 + R[2] / 100, n - 20);
    };
    const plan1LegacyAtDeath = plan1.netLegacy * Math.pow(1 + afterTaxBond / 100, yearsToDeath);
    // Death benefit INCLUDES cash value (DB = CV + net amount at risk), so the
    // legacy can never be below the projected cash value — floor it there.
    const plan2LegacyAtDeath = Math.max(
        projectTier(plan2.netLegacy, yearsToDeath, dbTiers),
        projectTier(plan2.effectiveCashValue, yearsToDeath, cvTiers)
    );

    // Reflect the projection age in the labels (fallback to 80 if markup differs)
    document.querySelectorAll('.legacy-death-age').forEach(el => { el.textContent = deathAge; });

    // Plan 1 Results
    setText('plan1Income', plan1.perpetualIncome);
    setText('plan1Liquidity', plan1.liquidity);
    setText('plan1Legacy', plan1LegacyAtDeath);
    setText('plan1AfterTax', plan1.afterTaxCapital);
    setText('plan1Annuitized', plan1.annuitizedAmount);
    setText('plan1Contributed', plan1.totalContributed);

    // Plan 2 Results
    setText('plan2Income', plan2.perpetualIncome);
    setText('plan2Liquidity', plan2.totalLiquidity);
    setText('plan2Legacy', plan2LegacyAtDeath);
    setText('plan2CashValue', plan2.cashValue);
    setText('plan2EPIG', plan2.netEPIGAfterLoanPayoff);
    setText('plan2Interest', plan2.cumulativeInterest);
    setText('plan2TaxOnGains', plan2.taxOnEPIGGains);
    setText('plan2GrossDB', plan2.grossDeathBenefit);
    setText('plan2Premiums', plan2.totalPremiumsPaid);
    
    // Update component year (safe with null checks)
    try {
        const timeHorizon = calculatorState.inputs.timeHorizon;
        const resultsYear = document.getElementById('resultsYear');
        const componentYear = document.getElementById('componentYear');
        const legacyYear = document.getElementById('legacyYear');
        const componentYearChart = document.getElementById('componentYearChart');
        
        if (resultsYear) resultsYear.textContent = timeHorizon;
        if (componentYear) componentYear.textContent = timeHorizon;
        if (legacyYear) legacyYear.textContent = timeHorizon;
        if (componentYearChart) componentYearChart.textContent = timeHorizon;
    } catch (error) {
        console.warn('Could not update component year display:', error);
    }
    
    // Skip chart generation to keep it simple (charts removed)
    console.log('Charts skipped - keeping display simple with numbers only');
    
    // Generate year-by-year table
    try {
        generateYearTable(plan2.yearlyData);
    } catch (error) {
        console.error('Error generating year table:', error);
    }
    
    // Generate long-term comparison table
    try {
        generateComparisonTable(plan1, plan2, calculatorState.inputs);
    } catch (error) {
        console.error('Error generating comparison table:', error);
    }
    
    // Show founding member savings callout
    try {
        const callout = document.getElementById('foundingSavingsCallout');
        if (callout) {
            callout.style.display = 'flex';
        }
    } catch (error) {
        console.warn('Could not show founding member callout:', error);
    }
    
    console.log('=== displayResults COMPLETE ===');
}

// ===================================
// LONG-TERM COMPARISON TABLE
// ===================================

function generateComparisonTable(plan1, plan2, inputs) {
    const { timeHorizon, taxRate, perpetualRate, currentAge, loanRate } = inputs;

    // Starting values at end of contribution period
    const plan1PerpetualIncome = plan1.perpetualIncome;
    const plan1LiquidityStart = plan1.liquidity; // 30% liquid fund

    const plan2PerpetualIncome = plan2.perpetualIncome; // Net EPIG annuity — perpetual
    const plan2CashValueStart = plan2.effectiveCashValue;
    const plan2DeathBenefitStart = plan2.netDeathBenefit;
    
    // Growth rates
    const plan1BondRate = 5; // 5% bonds (taxable annually)
    
    // Plan 2: Based on REAL MassMutual illustration (Select Preferred Non-Tobacco, non-guaranteed/current dividend scale)
    // Source: MassMutual WL 12-Pay, Age 52, $50K/year for 12 years
    // Actual values: Y10=$582K CV/$1.533M DB, Y20=$1.133M/$2.062M, Y30=$1.890M/$2.707M, Y40=$2.966M/$3.615M
    // Growth rates calculated from actual illustration data:
    // Rates are post-premium INTERNAL growth, measured from the end of the contribution period.
    // Prior value here was 6.88% (illustration yrs 10-20), but that window still included 2
    // premium-paying years, so it over-counted growth. The true post-premium rate (illustration
    // yr 12 -> yr 22: $738,631 -> $1,259,480) is ~5.48%.
    const plan2CashValueRate_0_10 = 5.48;   // Proj yrs 0-10 (first decade after premiums end): ~5.5% post-premium internal growth
    const plan2CashValueRate_10_20 = 5.24;  // Proj yrs 10-20: 5.24% CAGR (illustration yrs ~22-32, post-premium)
    const plan2CashValueRate_20_plus = 4.61; // Proj yrs 20+: 4.61% CAGR (illustration yrs ~32-42, post-premium)
    
    const plan2DeathBenefitRate_0_10 = 3.00;  // Years 10-20: 3.00% CAGR (from real data)
    const plan2DeathBenefitRate_10_20 = 2.76; // Years 20-30: 2.76% CAGR (from real data)
    const plan2DeathBenefitRate_20_plus = 2.93; // Years 30-40: 2.93% CAGR (from real data)
    
    // Project to years 0, 10, 20, 30, 40 from END of contribution period
    // Year 0 = end of contribution period, Year 10 = 10 years after contributions end
    const projectionYears = [0, 10, 20, 30, 40];
    const comparisons = [];
    
    projectionYears.forEach(years => {
        const totalYears = timeHorizon + years;
        const ageAtYear = currentAge + totalYears;
        
        // Plan 1: Liquidity grows at bond rate but taxed annually
        // After-tax bond return = 5% × (1 - 25%) = 3.75%
        const plan1AfterTaxBondRate = plan1BondRate * (1 - taxRate / 100);
        const plan1Liquidity = plan1LiquidityStart * Math.pow(1 + plan1AfterTaxBondRate / 100, years);
        
        // Plan 2 Cash Value: Multi-tier growth (based on MassMutual illustration)
        let plan2CashValue;
        if (years === 0) {
            plan2CashValue = plan2CashValueStart;
        } else if (years <= 10) {
            // Years 0-10: High growth rate
            plan2CashValue = plan2CashValueStart * Math.pow(1 + plan2CashValueRate_0_10 / 100, years);
        } else if (years <= 20) {
            // Years 10-20: Moderate growth
            const valueAt10 = plan2CashValueStart * Math.pow(1 + plan2CashValueRate_0_10 / 100, 10);
            plan2CashValue = valueAt10 * Math.pow(1 + plan2CashValueRate_10_20 / 100, years - 10);
        } else {
            // Years 20+: Lower growth
            const valueAt10 = plan2CashValueStart * Math.pow(1 + plan2CashValueRate_0_10 / 100, 10);
            const valueAt20 = valueAt10 * Math.pow(1 + plan2CashValueRate_10_20 / 100, 10);
            plan2CashValue = valueAt20 * Math.pow(1 + plan2CashValueRate_20_plus / 100, years - 20);
        }
        
        // Plan 2 Liquidity (while alive): the policy cash value. Net EPIG is
        // fully annuitized for income and the cash value is never borrowed
        // against for income, so there is no loan to net out — and nothing to
        // lapse. The cash value simply keeps compounding tax-free.
        const plan2LiquidityAlive = plan2CashValue;

        // Plan 2 Death Benefit: Multi-tier growth (based on MassMutual illustration)
        let plan2DeathBenefit;
        if (years === 0) {
            plan2DeathBenefit = plan2DeathBenefitStart;
        } else if (years <= 10) {
            // Years 0-10: Higher growth
            plan2DeathBenefit = plan2DeathBenefitStart * Math.pow(1 + plan2DeathBenefitRate_0_10 / 100, years);
        } else if (years <= 20) {
            // Years 10-20: Moderate growth
            const valueAt10 = plan2DeathBenefitStart * Math.pow(1 + plan2DeathBenefitRate_0_10 / 100, 10);
            plan2DeathBenefit = valueAt10 * Math.pow(1 + plan2DeathBenefitRate_10_20 / 100, years - 10);
        } else {
            // Years 20+: Lower growth
            const valueAt10 = plan2DeathBenefitStart * Math.pow(1 + plan2DeathBenefitRate_0_10 / 100, 10);
            const valueAt20 = valueAt10 * Math.pow(1 + plan2DeathBenefitRate_10_20 / 100, 10);
            plan2DeathBenefit = valueAt20 * Math.pow(1 + plan2DeathBenefitRate_20_plus / 100, years - 20);
        }
        
        // Death Benefit already INCLUDES cash value (DB = CV + Net Amount at
        // Risk), so it can never be less than CV. Accumulation-phase loans were
        // already repaid from EPIG, so nothing is deducted here — heirs receive
        // the full death benefit.
        const plan2LegacyAtDeath = Math.max(plan2DeathBenefit, plan2CashValue);

        comparisons.push({
            year: totalYears,
            age: ageAtYear,
            plan1Income: plan1PerpetualIncome,
            plan1Liquidity: plan1Liquidity,
            plan1Legacy: plan1Liquidity, // heirs receive the liquidity fund
            plan2Income: plan2PerpetualIncome, // Net EPIG annuity — perpetual, never lapses
            plan2LiquidityAlive: plan2LiquidityAlive, // While alive
            plan2LegacyAtDeath: plan2LegacyAtDeath,   // At death
            plan2DeathBenefit: plan2DeathBenefit,
            plan2CashValue: plan2CashValue
        });
    });
    
    // Display the comparison table
    displayComparisonTable(comparisons);
}

function displayComparisonTable(comparisons) {
    const container = document.getElementById('comparisonTableContainer');
    if (!container) {
        console.warn('Comparison table container not found');
        return;
    }
    
    let html = `
        <div class="comparison-table-wrapper">
            <h3 class="comparison-title">
                <i class="fas fa-balance-scale"></i> Long-Term Comparison: Plan 1 vs Plan 2
            </h3>
            <p class="comparison-subtitle">Projected values at end of contribution period and at 10-year intervals thereafter</p>
            
            <div style="padding: 15px; background: #fff8e1; border-left: 4px solid #d4af37; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.6;">
                    <i class="fas fa-info-circle" style="color: #d4af37;"></i> <strong>Growth Rates Derived From a Real MassMutual Illustration:</strong><br>
                    MassMutual Whole Life 12-Pay | Select Preferred Non-Tobacco | Age 52, $50K/year for 12 years<br>
                    Illustration values: Y10=$582K CV/$1.533M DB, Y20=$1.133M/$2.062M, Y30=$1.890M/$2.707M, Y40=$2.966M/$3.615M<br>
                    <em>Only the cash-value and death-benefit GROWTH RATES are taken from this illustration. The starting death benefit is the value you enter above — set it to match your own policy illustration (the cited example shows ≈$1.53M at Year 10 for $50K/year).</em><br>
                    <strong style="color: #b8860b;">Non-guaranteed:</strong> These figures reflect MassMutual's current dividend scale, which is not guaranteed and can change. Actual results will differ; guaranteed values are lower.
                    <a href="documents/massmutual-illustration.pdf" target="_blank" rel="noopener" style="color: #d4af37; text-decoration: underline; margin-left: 10px;">📄 View Full Illustration (PDF)</a>
                </p>
            </div>
            
            <div class="comparison-notes">
                <div class="note-item plan1-note">
                    <strong>Plan 1 Growth Assumptions:</strong><br>
                    • Income: 70% of after-tax capital annuitized at the perpetual rate (life annuity — consumed at death)<br>
                    • Perpetual income continues unchanged (not inflation-adjusted)<br>
                    • Liquidity fund (30%) invested in bonds at 5%, taxed annually → net ~3.75%/year<br>
                    • <strong>At Death:</strong> Heirs receive the liquidity fund (shown in the Legacy column)
                </div>
                <div class="note-item plan2-note">
                    <strong>Plan 2 Growth Assumptions (MassMutual rates non-guaranteed):</strong><br>
                    • Accumulation: premiums build tax-free cash value; loans are taken against it and invested in EPIG. EPIG compounds; the loan (principal + interest) is repaid from the EPIG proceeds<br>
                    • Wash loan: the borrowed cash value keeps earning the credited rate, so the loan's net cost is (loan rate − cash-value rate). Loan interest is treated as deductible against the EPIG gain<br>
                    • Income: 100% of the Net EPIG that remains outside the policy is annuitized at the perpetual rate — a life annuity that pays for life and <strong>never lapses</strong><br>
                    • The cash value is never annuitized or borrowed against for income — it stays inside the policy as tax-free liquidity and the death benefit<br>
                    • Cash value grows tax-deferred at ~5.5%/yr once premiums end, easing to ~5.2% then ~4.6% in later decades (non-guaranteed)<br>
                    • Death benefit grows: 3.00% (years 10-20), 2.76% (20-30), 2.93% (30-40)<br>
                    • <strong>While Alive:</strong> Liquidity = policy cash value<br>
                    • <strong>At Death:</strong> Heirs receive the death benefit (Death Benefit = Cash Value + Net Amount at Risk, not additive). The annuitized Net EPIG is consumed by the life annuity
                </div>
            </div>
            
            <div class="comparison-table-scroll">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th rowspan="2">Year<br>(Age)</th>
                            <th colspan="3">Plan 1: Direct Invest</th>
                            <th colspan="3">Plan 2: Whole Life + EPIG</th>
                        </tr>
                        <tr>
                            <th>Pension Income</th>
                            <th>Liquidity</th>
                            <th>Legacy (At Death)</th>
                            <th>Pension Income</th>
                            <th>Liquidity (Alive)</th>
                            <th>Legacy (At Death)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    comparisons.forEach((row, index) => {
        html += `
            <tr class="comparison-row ${index % 2 === 0 ? 'even' : 'odd'}">
                <td class="year-cell"><strong>Year ${row.year}</strong><br><span style="font-size: 13px; font-weight: 400;">(Age ${row.age})</span></td>
                <td class="plan1-cell">${formatCurrency(row.plan1Income)}/year</td>
                <td class="plan1-cell">${formatCurrency(row.plan1Liquidity)}</td>
                <td class="plan1-cell legacy-value">${formatCurrency(row.plan1Legacy)}</td>
                <td class="plan2-cell">${formatCurrency(row.plan2Income)}/year</td>
                <td class="plan2-cell">${formatCurrency(row.plan2LiquidityAlive)}</td>
                <td class="plan2-cell legacy-value">${formatCurrency(row.plan2LegacyAtDeath)}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>

            <div class="comparison-insights">
                <div class="insight-box">
                    <i class="fas fa-lightbulb"></i>
                    <strong>Key Insight:</strong> Plan 2's income comes entirely from annuitizing the Net EPIG that sits <em>outside</em> the policy (compounded EPIG proceeds after the policy loan is repaid) — a life annuity that pays for life and never lapses. The cash value is never annuitized or borrowed against for income; it stays inside the policy as tax-free liquidity while alive and, as part of the death benefit (Death Benefit = Cash Value + Net Amount at Risk), passes to heirs. Plan 2 typically trades some income versus Plan 1 in exchange for that death benefit and tax-free cash value. Annuity income may be partially taxable; income-phase taxes are not modeled.
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    container.style.display = 'block';
}

function formatCurrency(value) {
    return '$' + value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// ===================================
// CHARTS
// ===================================

function generateCharts(plan1, plan2) {
    console.log('=== generateCharts CALLED ===');
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not loaded. Skipping chart generation.');
        showChartUnavailableMessage();
        return;
    }
    
    // Check if canvas elements exist
    const liquidityCanvas = document.getElementById('liquidityChart');
    const componentsCanvas = document.getElementById('componentsChart');
    
    if (!liquidityCanvas || !componentsCanvas) {
        console.warn('⚠️ Chart canvas elements not found. Skipping chart generation.');
        return;
    }
    
    // Destroy existing charts
    if (calculatorState.charts.liquidity) {
        calculatorState.charts.liquidity.destroy();
    }
    if (calculatorState.charts.components) {
        calculatorState.charts.components.destroy();
    }
    
    try {
        console.log('Creating liquidity chart...');
        // Chart 1: Liquidity Growth Over Time
        const liquidityCtx = liquidityCanvas.getContext('2d');
    
    const years = Array.from({ length: calculatorState.inputs.timeHorizon }, (_, i) => i + 1);
    const plan1LiquidityData = plan1.yearlyData.map(d => d.portfolioValue);
    const plan2LiquidityData = [];
    
    for (let i = 0; i < plan2.yearlyData.length; i++) {
        const row = plan2.yearlyData[i];
        const netEPIG = Math.max(0, row.epigValue - row.loanBalance);
        plan2LiquidityData.push(row.cashValue + netEPIG);
    }
    
    calculatorState.charts.liquidity = new Chart(liquidityCtx, {
        type: 'line',
        data: {
            labels: years.map(y => `Year ${y}`),
            datasets: [
                {
                    label: 'Plan 1: Direct Invest (After-Tax)',
                    data: plan1LiquidityData,
                    borderColor: '#E0A930',
                    backgroundColor: 'rgba(224, 169, 48, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Plan 2: Total Liquidity',
                    data: plan2LiquidityData,
                    borderColor: '#F2C14E',
                    backgroundColor: 'rgba(242, 193, 78, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#F5F3ED',
                        font: { size: 13, family: 'Montserrat' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9CA3AF', font: { family: 'Montserrat' } },
                    grid: { color: 'rgba(224, 169, 48, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#9CA3AF', 
                        font: { family: 'Montserrat' },
                        callback: (value) => formatCurrency(value, true)
                    },
                    grid: { color: 'rgba(224, 169, 48, 0.1)' }
                }
            }
        }
    });
    
    console.log('Liquidity chart created successfully');
    
    // Chart 2: Plan 2 Components (Bar Chart)
    console.log('Creating components chart...');
    const componentsCtx = document.getElementById('componentsChart').getContext('2d');
    
    calculatorState.charts.components = new Chart(componentsCtx, {
        type: 'bar',
        data: {
            labels: ['Cash Value', 'Net EPIG (after loan payoff)'],
            datasets: [{
                label: 'Amount ($)',
                data: [plan2.cashValue, plan2.netEPIGAfterLoanPayoff],
                backgroundColor: [
                    'rgba(224, 169, 48, 0.7)',
                    'rgba(242, 193, 78, 0.7)'
                ],
                borderColor: [
                    '#E0A930',
                    '#F2C14E'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.raw)
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9CA3AF', font: { family: 'Montserrat' } },
                    grid: { color: 'rgba(224, 169, 48, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#9CA3AF', 
                        font: { family: 'Montserrat' },
                        callback: (value) => formatCurrency(value, true)
                    },
                    grid: { color: 'rgba(224, 169, 48, 0.1)' }
                }
            }
        }
    });
    
    console.log('Components chart created successfully');
    console.log('=== All charts generated successfully ===');
    
    } catch (error) {
        console.error('Error generating charts:', error);
        showChartUnavailableMessage();
    }
}

// Helper function to show chart unavailable message
function showChartUnavailableMessage() {
    const chartsSection = document.querySelector('.charts-section');
    if (chartsSection) {
        chartsSection.innerHTML = `
            <div style="background: rgba(251, 191, 36, 0.15); border: 2px solid #fbbf24; padding: 30px; border-radius: 16px; text-align: center; margin: 20px 0;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #fbbf24; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #fbbf24; margin: 0 0 12px 0; font-size: 20px;">Charts Unavailable</h3>
                <p style="color: #9CA3AF; margin: 0; font-size: 15px; line-height: 1.6;">
                    The charting library could not be loaded (possibly due to network restrictions).<br>
                    <strong>All calculations are complete</strong> and data is available in the table below.
                </p>
            </div>
        `;
    }
}

// ===================================
// YEAR-BY-YEAR TABLE
// ===================================

function generateYearTable(yearlyData) {
    const tbody = document.getElementById('yearTableBody');
    tbody.innerHTML = '';
    
    calculatorState.yearlyData = yearlyData;
    
    yearlyData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.year}</td>
            <td>${formatCurrency(row.funding)}</td>
            <td>${formatCurrency(row.borrowed)}</td>
            <td>${formatCurrency(row.loanBalance)}</td>
            <td>${formatCurrency(row.interestPayment)}</td>
            <td>${formatCurrency(row.cumulativeInterest || 0)}</td>
            <td>${formatCurrency(row.epigValue)}</td>
            <td>${formatCurrency(row.cashValue)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ===================================
// TABLE ACTIONS
// ===================================

function toggleYearTable() {
    const tableContainer = document.getElementById('yearTableContainer');
    const button = document.getElementById('tableToggle');
    
    if (tableContainer.style.display === 'none' || !tableContainer.style.display) {
        tableContainer.style.display = 'block';
        button.innerHTML = '<i class="fas fa-table"></i> Hide Table';
        button.classList.add('active');
    } else {
        tableContainer.style.display = 'none';
        button.innerHTML = '<i class="fas fa-table"></i> Show Table';
        button.classList.remove('active');
    }
}

// ===================================
// REMOVED: Download CSV and Share Link Functions
// These functions were removed as buttons are no longer needed
// ===================================

// ===================================
// RESET TO DEFAULTS
// ===================================

function resetToDefaults() {
    document.getElementById('currentAge').value = 51;
    document.getElementById('timeHorizon').value = 10;
    document.getElementById('annualFunding').value = 50000;
    document.getElementById('contributionTiming').checked = false;
    document.getElementById('directCAGR').value = 20;
    document.getElementById('taxRate').value = '25';
    document.getElementById('customTaxRate').style.display = 'none';
    document.getElementById('perpetualRate').value = 7;
    document.getElementById('cvGrowthRate').value = 4;
    document.getElementById('borrowPct').value = 90;
    document.getElementById('loanRate').value = 6;
    document.getElementById('epigCAGR').value = 26;
    document.getElementById('interestHandling').value = 'paid';
    document.getElementById('deathBenefit').value = 750000;
    document.getElementById('reduceDB').checked = true;
    
    // Clear warnings
    const warningBox = document.getElementById('warningBox');
    if (warningBox) {
        warningBox.style.display = 'none';
        warningBox.innerHTML = '';
    }
}

// ===================================
// URL PARAMETERS
// ===================================

function loadFromURLParameters() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('annualContribution')) {
        params.forEach((value, key) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value === 'true';
                } else {
                    element.value = value;
                }
            }
        });
        
        // Auto-calculate if params exist
        setTimeout(() => calculate(), 500);
    }
}

// ===================================
// MODAL HANDLERS
// ===================================

function setupModalHandlers() {
    const viewExampleBtn = document.getElementById('viewExampleBtn');
    
    // "View Example" button now triggers calculation with default values
    if (viewExampleBtn) {
        viewExampleBtn.addEventListener('click', () => {
            // Scroll to calculator
            document.getElementById('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Wait for scroll, then calculate
            setTimeout(() => {
                calculate();
            }, 500);
        });
    }
}

// ===================================
// UTILITIES
// ===================================

function formatCurrency(value, short = false) {
    if (short && Math.abs(value) >= 1000) {
        if (Math.abs(value) >= 1000000) {
            return '$' + (value / 1000000).toFixed(1) + 'M';
        }
        return '$' + (value / 1000).toFixed(0) + 'K';
    }
    
    return '$' + value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}
