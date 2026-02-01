/**
 * Financial Freedom Outcomes Calculator
 * Compares Plan 1 (Direct Invest) vs Plan 2 (Whole Life + EPIG Borrowing)
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
        directCAGR: parseFloat(safeGetValue('directCAGR', '20')) || 20,
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
    
    // Legacy: Plan 1 has NO death benefit beyond the liquid fund
    // Heirs receive the liquidity fund at death, but it's NOT additional
    // To be consistent with Plan 2 (where legacy = death benefit, separate from liquidity)
    // Plan 1 legacy should be $0 (no insurance death benefit)
    const netLegacy = 0;
    
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
        
        // Borrow amount (as % of premium)
        const borrowAmount = premium * (borrowPercent / 100);
        
        // Loan interest (calculated on beginning-of-year balance)
        const interestPayment = loanBalance * (loanRate / 100);
        cumulativeInterest += interestPayment;
        
        // EPIG investment growth (using same CAGR as Plan 1)
        if (contributionTiming === 'start') {
            epigValue += borrowAmount;
            epigValue *= (1 + directCAGR / 100);
        } else {
            epigValue *= (1 + directCAGR / 100);
            epigValue += borrowAmount;
        }
        
        // Update loan balance: interest is paid from EPIG, only principal accrues
        loanBalance += borrowAmount;
        
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
    
    // APPLES-TO-APPLES: Subtract cumulative interest from EPIG to reflect true cost
    // This shows EPIG performance NET OF borrowing costs
    const epigAfterInterest = epigValue - cumulativeInterest;
    
    // Calculate EPIG gains and tax
    const totalBorrowed = annualContribution * timeHorizon * (borrowPercent / 100);
    const epigGains = epigAfterInterest - totalBorrowed;
    const taxOnEPIGGains = epigGains * (inputs.taxRate / 100);
    const epigAfterTax = epigAfterInterest - taxOnEPIGGains;
    
    // Net EPIG after loan payoff (OUTSIDE policy - CAN be annuitized)
    // Step 1: EPIG after interest and taxes
    // Step 2: Subtract the principal loan balance to get net equity
    const netEPIGAfterLoanPayoff = Math.max(0, epigAfterTax - loanBalance);
    
    // CORRECTED: Perpetual income ONLY from Net EPIG (outside policy)
    // Cash value inside policy CANNOT be annuitized
    const annuitizableAmount = netEPIGAfterLoanPayoff;
    const perpetualIncome = annuitizableAmount * (perpetualRate / 100);
    
    // APPLES-TO-APPLES: Liquidity = Cash Value only
    // Net EPIG is already annuitized for income above, so it's NOT available as liquidity
    // This matches Plan 1 where liquidity = 30% fund (after annuitizing 70%)
    const totalLiquidity = cashValue;  // Only cash value - Net EPIG already annuitized
    
    // Death benefit
    // Since we already paid off the loan from Net EPIG, there's no outstanding loan
    // Death benefit is NOT reduced (loan was paid from EPIG)
    const grossDeathBenefit = deathBenefit;
    const netDeathBenefit = deathBenefit;  // No reduction - loan already paid
    const netLegacy = netDeathBenefit - totalPremiumsPaid;
    
    return {
        yearlyData,
        cashValue,
        epigValue,
        epigAfterInterest,  // EPIG value minus cumulative interest cost
        epigAfterTax,       // NEW: EPIG after interest and taxes
        cumulativeInterest, // Total interest paid/accrued over time horizon
        taxOnEPIGGains,     // NEW: Tax on EPIG gains
        loanBalance,
        totalPremiumsPaid,
        epigGains,
        netEPIGAfterLoanPayoff,
        annuitizableAmount,  // Only the portion that can be annuitized
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
    
    // Plan 1 Results
    try {
        document.getElementById('plan1Income').textContent = formatCurrency(plan1.perpetualIncome);
        document.getElementById('plan1Liquidity').textContent = formatCurrency(plan1.liquidity);
        document.getElementById('plan1Legacy').textContent = formatCurrency(plan1.netLegacy);
        document.getElementById('plan1AfterTax').textContent = formatCurrency(plan1.afterTaxCapital);
        document.getElementById('plan1Annuitized').textContent = formatCurrency(plan1.annuitizedAmount);
        document.getElementById('plan1Contributed').textContent = formatCurrency(plan1.totalContributed);
        console.log('Plan 1 results populated successfully');
    } catch (error) {
        console.error('Error populating Plan 1 results:', error);
    }
    
    // Plan 2 Results
    try {
        document.getElementById('plan2Income').textContent = formatCurrency(plan2.perpetualIncome);
        document.getElementById('plan2Liquidity').textContent = formatCurrency(plan2.totalLiquidity);
        document.getElementById('plan2Legacy').textContent = formatCurrency(plan2.netLegacy);
        document.getElementById('plan2CashValue').textContent = formatCurrency(plan2.cashValue);
        document.getElementById('plan2EPIG').textContent = formatCurrency(plan2.netEPIGAfterLoanPayoff);
        document.getElementById('plan2Interest').textContent = formatCurrency(plan2.cumulativeInterest);
        document.getElementById('plan2TaxOnGains').textContent = formatCurrency(plan2.taxOnEPIGGains);
        document.getElementById('plan2GrossDB').textContent = formatCurrency(plan2.grossDeathBenefit);
        document.getElementById('plan2Premiums').textContent = formatCurrency(plan2.totalPremiumsPaid);
        console.log('Plan 2 results populated successfully');
    } catch (error) {
        console.error('Error populating Plan 2 results:', error);
    }
    
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
    const { timeHorizon, taxRate, perpetualRate, currentAge } = inputs;
    
    // Starting values at end of contribution period
    const plan1PerpetualIncome = plan1.perpetualIncome;
    const plan1LiquidityStart = plan1.liquidity; // 30% liquid fund
    
    const plan2PerpetualIncome = plan2.perpetualIncome;
    const plan2CashValueStart = plan2.cashValue;
    const plan2NetEPIGStart = plan2.netEPIGAfterLoanPayoff;
    const plan2DeathBenefitStart = plan2.netDeathBenefit;
    
    // Growth rates
    const plan1BondRate = 5; // 5% bonds (taxable annually)
    
    // Plan 2: Based on REAL MassMutual illustration (Standard Plus Non-Tobacco)
    // Source: MassMutual WL 12-Pay, Age 52, $50K/year for 12 years
    // Actual values: Y10=$582K CV/$1.533M DB, Y20=$1.133M/$2.062M, Y30=$1.890M/$2.707M, Y40=$2.966M/$3.615M
    // Growth rates calculated from actual illustration data:
    const plan2CashValueRate_0_10 = 6.88;   // Years 10-20: 6.88% CAGR (from real data)
    const plan2CashValueRate_10_20 = 5.24;  // Years 20-30: 5.24% CAGR (from real data)
    const plan2CashValueRate_20_plus = 4.61; // Years 30-40: 4.61% CAGR (from real data)
    
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
        
        // Plan 2 Net EPIG: Reinvested in bonds (after-tax growth)
        const plan2NetEPIG = plan2NetEPIGStart * Math.pow(1 + plan1AfterTaxBondRate / 100, years);
        
        // Plan 2 Liquidity (while alive): ONLY Cash Value
        // Net EPIG is annuitized for income at Year 0, so NOT available as liquidity
        // This matches Plan 1 where liquidity = 30% fund (after annuitizing 70%)
        const plan2LiquidityAlive = plan2CashValue;  // Only cash value - Net EPIG annuitized
        
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
        
        // CORRECTED: Death Benefit already INCLUDES cash value
        // Death Benefit = Cash Value + Net Amount at Risk
        // At death, heir receives: Death Benefit + Net EPIG (outside policy only)
        const plan2LegacyAtDeath = plan2DeathBenefit + plan2NetEPIG;
        
        comparisons.push({
            year: totalYears,
            age: ageAtYear,
            plan1Income: plan1PerpetualIncome,
            plan1Liquidity: plan1Liquidity,
            plan1Legacy: 0, // Plan 1 has no guaranteed legacy
            plan2Income: plan2PerpetualIncome,
            plan2LiquidityAlive: plan2LiquidityAlive, // While alive
            plan2LegacyAtDeath: plan2LegacyAtDeath,   // At death
            plan2DeathBenefit: plan2DeathBenefit,
            plan2CashValue: plan2CashValue,
            plan2NetEPIG: plan2NetEPIG
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
                    <i class="fas fa-info-circle" style="color: #d4af37;"></i> <strong>Default Example Based on Real MassMutual Illustration:</strong><br>
                    MassMutual Whole Life 12-Pay | Standard Plus Non-Tobacco (SPNT) | Age 52, $50K/year for 12 years<br>
                    Actual Values: Y10=$582K CV/$1.533M DB, Y20=$1.133M/$2.062M, Y30=$1.890M/$2.707M, Y40=$2.966M/$3.615M<br>
                    <em>When you change inputs (age, amount, etc.), projections scale proportionally to approximate Standard Plus Non-Tobacco results.</em>
                    <a href="documents/MassMutual-Illustration.pdf" target="_blank" style="color: #d4af37; text-decoration: underline; margin-left: 10px;">📄 View Full Illustration (PDF)</a>
                </p>
            </div>
            
            <div class="comparison-notes">
                <div class="note-item plan1-note">
                    <strong>Plan 1 Growth Assumptions:</strong><br>
                    • Perpetual income continues unchanged<br>
                    • Liquidity fund (30%) invested in bonds at 5%<br>
                    • Taxed annually at effective tax rate → Net ~3.75%/year<br>
                    • <strong>At Death:</strong> Heirs receive liquidity fund only (no separate death benefit)<br>
                    • Legacy shown as $0 (liquidity fund already counted above)
                </div>
                <div class="note-item plan2-note">
                    <strong>Plan 2 Growth Assumptions (Real MassMutual Data):</strong><br>
                    • Perpetual income continues unchanged<br>
                    • <strong>While Alive:</strong> Liquidity = Cash Value only (Net EPIG annuitized for income)<br>
                    • Cash value grows tax-free: 6.88% (years 10-20), 5.24% (20-30), 4.61% (30-40)<br>
                    • Death benefit grows: 3.00% (years 10-20), 2.76% (20-30), 2.93% (30-40)<br>
                    • <strong>At Death:</strong> Heirs receive Death Benefit + Net EPIG (assumes period-certain annuity)<br>
                    • Death Benefit = Cash Value + Net Amount at Risk (not additive!)
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
                <td class="plan1-cell legacy-zero">$0</td>
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
                    <strong>Key Insight:</strong> Plan 2's death benefit INCLUDES cash value (Death Benefit = Cash Value + Net Amount at Risk). At death, heirs receive the Death Benefit PLUS Net EPIG (outside policy), NOT Death Benefit + Cash Value + Net EPIG. While alive, you have access to Cash Value + Net EPIG as liquidity.
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
