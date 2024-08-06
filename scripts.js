let cashFlowChart;
let co2Chart;

function renderCashFlowChart(years, productionInfrastructure, h2Fleet) {
    if (cashFlowChart) {
        cashFlowChart.destroy();
    }

    const ctx2 = document.getElementById('cashFlowChart').getContext('2d');
    cashFlowChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Production infrastructure',
                    data: productionInfrastructure,
                    backgroundColor: 'rgba(255, 165, 0, 0.6)',
                    borderColor: 'rgba(255, 165, 0, 1)',
                    fill: true
                },
                {
                    label: 'H2 Fleet',
                    data: h2Fleet,
                    backgroundColor: 'rgba(255, 255, 0, 0.6)',
                    borderColor: 'rgba(255, 255, 0, 1)',
                    fill: true
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'Yearly cash flows for project (USD/year)'
            },
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Year'
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Cash flows (USD)'
                    }
                }]
            }
        }
    });
}

function renderCO2Chart(years, dieselEmissions, h2GPUSMREmissions, h2GPUSelfProductionEmissions) {
    if (co2Chart) {
        co2Chart.destroy();
    }

    const ctx1 = document.getElementById('co2Chart').getContext('2d');
    co2Chart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Diesel fleet emissions',
                    data: dieselEmissions,
                    borderColor: 'rgba(0, 0, 0, 1)',
                    fill: false,
                    lineTension: 0.1
                },
                {
                    label: 'H2 GPU fleet emissions (SMR)',
                    data: h2GPUSMREmissions,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                    lineTension: 0.1
                },
                {
                    label: 'H2 GPU fleet emissions (grid electrolysis)',
                    data: h2GPUSelfProductionEmissions,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                    lineTension: 0.1
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'CO2 emissions for equivalent fleet (t/year)'
            },
            scales: {
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Year'
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'CO2 emissions (t/year)'
                    }
                }]
            }
        }
    });
}

function computeModel() {
    const airportCountry = document.getElementById('airportCountry').value;
    const wacc = parseFloat(document.getElementById('wacc').value);
    const GPU_fleet = parseInt(document.getElementById('GPU_fleet').value);
    const dGPU_OpH = parseInt(document.getElementById('dGPU_OpH').value);
    const dGPU_OpD = parseInt(document.getElementById('dGPU_OpD').value);
    const REPfleet = parseFloat(document.getElementById('REPfleet').value);

    const countryData = {
        'Spain': { price: 0.186, CO2: 178 },
        'France': { price: 0.156, CO2: 74 }
    };

    const countries = Object.keys(countryData);
    const countryMatrix = countries.map(country => [countryData[country].price, countryData[country].CO2]);

    const years = [2025, 2026, 2027, 2028, 2029, 2030];

    const assumptions_gse_h2_gpu_h2_consumption = 4.3;
    const assumptions_gse_h2_gpu_h2_price = [350000, 260000, 240000, 220000, 200000, 180000];
    const assumptions_gse_h2_gpu_stack_price = 0.165;
    const assumptions_gse_h2_gpu_lifespan = 20000;
    const assumptions_gse_h2_gpu_maintenance_cost = 0.027;
    
    const assumptions_GSE_diesel_GPU_diesel_consumption = 20;
    const assumptions_GSE_diesel_GPU_price = 70000;
    const assumptions_GSE_diesel_GPU_lifespan = 20000;
    const assumptions_GSE_diesel_GPU_maitenance_cost = 0.15;
    const assumptions_GSE_diesel_GPU_full_depreciation = assumptions_GSE_diesel_GPU_lifespan / (dGPU_OpH*dGPU_OpD);
    const assumptions_GSE_diesel_GPU_co2_emmissions = 2.3;
    const assumptions_GSE_diesel_GPU_diesel_cost = 1;

    let electricityPrice, co2_kWh;
    if (countries.includes(airportCountry)) {
        const countryIndex = countries.indexOf(airportCountry);
        [electricityPrice, co2_kWh] = countryMatrix[countryIndex];
    } else {
        console.log(`Country ${airportCountry} not found in the database.\n`);
    }

    const assumptions_ProdScen_energy_SMR_H2_CO2 = 8000;
    const assumptions_ProdScen_energy_GH2_price = 4.3;

    const assumptions_ProdScen_electrolyser_cost_kW = 1945.5;
    const assumptions_ProdScen_electrolyser_stack_price = 0.15;
    const assumptions_ProdScen_electrolyser_consumption = 44.23;
    const assumptions_ProdScen_electrolyser_maintenance_cost = 0.03;
    const assumptions_ProdScen_electrolyser_stack_lifespan = 35000;
    const assumptions_ProdScen_electrolyser_stack_depreciation =  assumptions_ProdScen_electrolyser_stack_lifespan / (assumptions_ProdScen_electrolyser_hour_op * assumptions_ProdScen_electrolyser_day_op);
    const assumptions_ProdScen_electrolyser_hour_op = 20;
    const assumptions_ProdScen_electrolyser_day_op = 365;
    const assumptions_ProdScen_electrolyser_m2_kw = 0.04;


    const h2GPUsInService = Array(6).fill(0);
    const initialH2GPUsInService = Math.round((REPfleet * GPU_fleet) / 6);
    h2GPUsInService[0] = initialH2GPUsInService;
    for (let i = 1; i < 5; i++) {h2GPUsInService[i] = h2GPUsInService[i - 1] + initialH2GPUsInService;}
    const maxH2GPUs = Math.round(REPfleet * GPU_fleet);
    h2GPUsInService[5] = h2GPUsInService[4] + initialH2GPUsInService > maxH2GPUs ? maxH2GPUs : h2GPUsInService[4] + initialH2GPUsInService;
    const dieselGPUsInService = h2GPUsInService.map(service => GPU_fleet - service);
    const h2ConsumptionPerYear = h2GPUsInService.map((service) => service * assumptions_gse_h2_gpu_h2_consumption * dGPU_OpH * dGPU_OpD);
    const dieselConsumptionPerYear = dieselGPUsInService.map((service) => service * assumptions_GSE_diesel_GPU_diesel_consumption * dGPU_OpH * dGPU_OpD);

    const h2ProductionCapacityRequired = h2ConsumptionPerYear.map((consumption, index) => Math.round((consumption * 1.2) / (assumptions_production_scenario_electrolyser[6][index] * assumptions_production_scenario_electrolyser[7][index])));
    const electrolysisCapacityRequired = h2ProductionCapacityRequired.map((capacity, index) => Math.round(capacity * assumptions_production_scenario_electrolyser[2][index]));
    const totalElectricityRequired = h2ConsumptionPerYear.map((consumption, index) => consumption * 1.2 * assumptions_production_scenario_electrolyser[2][index]);

    const calculations_production_scenarios_full_on_site = [
        h2ProductionCapacityRequired,
        electrolysisCapacityRequired,
        totalElectricityRequired
    ];

    console.log("\ncalculations_production_scenarios_full_on_site:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsProduction = [
        "Min H2 production capacity req (kg/h)",
        "Min electrolysis capacity req (kW)",
        "Total electricity req (kWh/year)"
    ];
    labelsProduction.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_production_scenarios_full_on_site[index].join('      ')}`);
    });

    const capex = electrolysisCapacityRequired.map((capacity, index) => capacity * assumptions_production_scenario_electrolyser[0][index]);
    const electricityCost = totalElectricityRequired.map((electricity, index) => electricity * assumptions_production_scenario_energy[0][index]);
    const otherOpex = capex.map((cost, index) => cost * assumptions_production_scenario_electrolyser[3][index]);
    const stackDepreciationValues = capex.map((cost, index) => (cost * assumptions_production_scenario_electrolyser[1][index]) / assumptions_production_scenario_electrolyser[5][index]);
    const totalElectrolyserYearly = capex.map((cost, index) => cost + electricityCost[index] + otherOpex[index] + stackDepreciationValues[index]);

    const h2CostSelfProduction = Array(6).fill(1);
    const electrolyserSpaceRequired = electrolysisCapacityRequired.map((capacity, index) => capacity * assumptions_production_scenario_electrolyser[8][index]);

    const calculations_production_scenarios_yearly_electrolyser_costs = [
        capex,
        electricityCost,
        otherOpex,
        stackDepreciationValues,
        totalElectrolyserYearly,
        h2CostSelfProduction,
        electrolyserSpaceRequired
    ];

    console.log("\ncalculations_production_scenarios_yearly_electrolyser_costs:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsElectrolyserCosts = [
        "CAPEX",
        "Electricity",
        "Other OPEX",
        "Stack depreciation",
        "Total electrolyser yearly",
        "H2 cost/kg, self production",
        "Electrolyser space required (m²)"
    ];
    labelsElectrolyserCosts.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_production_scenarios_yearly_electrolyser_costs[index].join('      ')}`);
    });

    const capexH2GPU = Array(6).fill(0);
    capexH2GPU[0] = calculations_GSE_fuel_consumption[0][0] * assumptions_gse_h2_gpu_h2_price[0];
    for (let i = 1; i < 6; i++) {
        capexH2GPU[i] = (calculations_GSE_fuel_consumption[0][i] - calculations_GSE_fuel_consumption[0][i - 1]) * assumptions_gse_h2_gpu_h2_price[i];
    }

    const h2Cost = h2ConsumptionPerYear.map((consumption, index) => consumption * calculations_production_scenarios_yearly_electrolyser_costs[5][index]);
    const maintenance = h2GPUsInService.map((service) => service * assumptions_gse_h2_gpu_h2_price * assumptions_gse_h2_gpu_maintenance_cost / 100);
    const depreciation = capexH2GPU.map(cost => cost / fullDepreciation);
    const totalH2GPU = capexH2GPU.map((cost, index) => cost + h2Cost[index] + maintenance[index] + depreciation[index]);

    const calculations_GSE_TCO_H2_GPU_costs = [
        capexH2GPU,
        h2Cost,
        maintenance,
        depreciation,
        totalH2GPU
    ];

    console.log("\ncalculations_GSE_TCO_H2_GPU_costs:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsTCOH2 = [
        "CAPEX",
        "H2 cost",
        "Maintenance",
        "Depreciation",
        "Total H2 GPU"
    ];
    labelsTCOH2.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_GSE_TCO_H2_GPU_costs[index].join('      ')}`);
    });

    const capexDieselGPU = Array(6).fill(0);
    const dieselCost = dieselConsumptionPerYear.map((consumption, index) => consumption * assumptions_GSE_diesel_GPU[6][index]);
    const dieselMaintenance = dieselGPUsInService.map((service, index) => service * assumptions_GSE_diesel_GPU[1][index] * assumptions_GSE_diesel_GPU[3][index]);
    const dieselDepreciation = dieselGPUsInService.map((service, index) => (service * assumptions_GSE_diesel_GPU[1][index]) / assumptions_GSE_diesel_GPU[4][index]);
    const totalDieselGPU = capexDieselGPU.map((cost, index) => cost + dieselCost[index] + dieselMaintenance[index] + dieselDepreciation[index]);

    const calculations_GSE_TCO_diesel_GPU_costs = [
        capexDieselGPU,
        dieselCost,
        dieselMaintenance,
        dieselDepreciation,
        totalDieselGPU
    ];

    console.log("\ncalculations_GSE_TCO_diesel_GPU_costs:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsTCODiesel = [
        "CAPEX",
        "Diesel cost",
        "Maintenance",
        "Depreciation",
        "Total H2 GPU"
    ];
    labelsTCODiesel.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_GSE_TCO_diesel_GPU_costs[index].join('      ')}`);
    });

    const co2IntensityElectricity = assumptions_production_scenario_energy[1];
    const smrHydrogenCarbonIntensity = assumptions_production_scenario_energy[2];
    const dieselHourlyConsumption = assumptions_GSE_diesel_GPU[0];
    const co2EmissionsPerKgFuel = assumptions_GSE_diesel_GPU[5];

    const h2GPUSelfProductionEmissions = totalElectricityRequired.map((electricity, index) => (electricity * co2IntensityElectricity[index]) / 1000000);
    const h2GPUSMREmissions = h2ConsumptionPerYear.map((consumption, index) => (consumption * smrHydrogenCarbonIntensity[index]) / 1000000);
    const dieselEmissions = h2GPUsInService.map((service, index) => (service * dieselHourlyConsumption[index] * dGPU_OpH * dGPU_OpD * co2EmissionsPerKgFuel[index]) / 1000);

    const reductionH2GPUSelf = dieselEmissions.map((emission, index) => emission - h2GPUSelfProductionEmissions[index]);
    const reductionH2GPUSMR = dieselEmissions.map((emission, index) => emission - h2GPUSMREmissions[index]);

    const calculations_CO2_emissions_compared_to_equivalent_full_diesel_fleet = [
        h2GPUSelfProductionEmissions,
        h2GPUSMREmissions,
        dieselEmissions,
        reductionH2GPUSelf,
        reductionH2GPUSMR
    ];

    console.log("\ncalculations_CO2_emissions_compared_to_equivalent_full_diesel_fleet:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsCO2 = [
        "H2 GPU (self-production)",
        "H2 GPU (SMR)",
        "Diesel",
        "Reduction H2 GPU (self)",
        "Reduction H2 GPU (SMR)"
    ];
    labelsCO2.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_CO2_emissions_compared_to_equivalent_full_diesel_fleet[index].join('      ')}`);
    });

    const productionInfrastructure = Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
        const year = 2025 + i;
        productionInfrastructure[i] = -((calculations_production_scenarios_yearly_electrolyser_costs[4][i] - calculations_production_scenarios_yearly_electrolyser_costs[3][i]) / Math.pow(1 + wacc, year - 2024));
    }

    const h2Fleet = Array(6).fill(0);
    for (let i = 0; i < 6; i++) {
        const year = 2025 + i;
        h2Fleet[i] = -((calculations_GSE_TCO_H2_GPU_costs[4][i] - dieselDepreciation[i]) / Math.pow(1 + wacc, year - 2024));
    }

    const totalCashFlow = productionInfrastructure.map((infrastructure, index) => infrastructure + h2Fleet[index]);

    const npvValue = totalCashFlow.reduce((sum, value) => sum + value, 0);

    const calculations_cash_flow = [
        productionInfrastructure,
        h2Fleet,
        totalCashFlow
    ];

    console.log("\ncalculations_cash_flow:");
    console.log("Parameter                                   2025      2026      2027      2028      2029      2030");
    const labelsCashFlow = [
        "Production infrastructure",
        "H2 Fleet",
        "Total"
    ];
    labelsCashFlow.forEach((label, index) => {
        console.log(`${label.padEnd(45)} ${calculations_cash_flow[index].map(value => Math.round(value)).join('      ')}`);
    });

    console.log(`\nNPV value: ${npvValue.toFixed(0)}`);

    renderCO2Chart(years, dieselEmissions, h2GPUSMREmissions, h2GPUSelfProductionEmissions);
    renderCashFlowChart(years, productionInfrastructure, h2Fleet);

     // Display results in the table
    const tableBody = document.getElementById('resultsTableBody');
    tableBody.innerHTML = '';

    const formatNumber = (number) => {
        let absNumber = Math.abs(number);
        let formattedNumber = absNumber.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return number < 0 ? `(-) $${formattedNumber}` : `$${formattedNumber}`;
    };

    const fixedWidth = '150px'; // Define the fixed width for the columns

    for (let i = 0; i < years.length; i++) {
        const row = document.createElement('tr');
        const yearCell = document.createElement('td');
        yearCell.textContent = years[i];
        row.appendChild(yearCell);
    
        const productionInfrastructureCell = document.createElement('td');
        productionInfrastructureCell.textContent = formatNumber(productionInfrastructure[i]);
        productionInfrastructureCell.style.width = fixedWidth;
        row.appendChild(productionInfrastructureCell);
    
        const h2FleetCell = document.createElement('td');
        h2FleetCell.textContent = formatNumber(h2Fleet[i]);
        h2FleetCell.style.width = fixedWidth;
        row.appendChild(h2FleetCell);
    
        const totalCashFlowCell = document.createElement('td');
        totalCashFlowCell.textContent = formatNumber(totalCashFlow[i]);
        totalCashFlowCell.style.width = fixedWidth;
        row.appendChild(totalCashFlowCell);
    
        tableBody.appendChild(row);
    }

    // Display NPV value
    const npvElement = document.getElementById('npvValue');
    npvElement.textContent = `NPV Value: ${formatNumber(npvValue)}`;

    const totalDieselEmissions = dieselEmissions.reduce((sum, value) => sum + value, 0);
    const totalReductionH2GPUSelf = reductionH2GPUSelf.reduce((sum, value) => sum + value, 0);
    const totalReductionH2GPUSMR = reductionH2GPUSMR.reduce((sum, value) => sum + value, 0);

    // Add the results to the HTML
    const resultsSection = document.getElementById('emissionResults');
    resultsSection.innerHTML = `
    <p>Total Diesel Emissions: ${totalDieselEmissions.toFixed(2)} tons</p>
    <p>Total Reduction H2 GPU (Self-production): ${totalReductionH2GPUSelf.toFixed(2)} tons</p>
    <p>Total Reduction H2 GPU (SMR): ${totalReductionH2GPUSMR.toFixed(2)} tons</p>
`;

// Your existing computeModel code...

    // After computing the electrolyserSpaceRequired
    const finalElectrolyserSpaceRequired = electrolyserSpaceRequired[electrolyserSpaceRequired.length - 1];
    console.log(finalElectrolyserSpaceRequired);
    const sideLengthMeters = surfaceAreaToSideLength(finalElectrolyserSpaceRequired);

    // Assume the center of the map as the location for the square (adjust as needed)
    const center = map.getCenter();
    const centerLat = center.lat;
    const centerLng = center.lng;
    createDraggableSquare(centerLat, centerLng, sideLengthMeters);

    // Continue with the rest of your existing computeModel code...
}

// Initialize the map
const map = L.map('map', {
    center: [43.628270, 1.368770],
    zoom: 15,
    maxZoom: 21,  // Set the maximum zoom level
    minZoom: 1    // Set the minimum zoom level
});

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 21,  // Set the maximum zoom level
    minZoom: 1    // Set the minimum zoom level
}).addTo(map);

// Initialize the FeatureGroup to store editable layers
const editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

// Function to convert surface area (m²) to side length (meters)
function surfaceAreaToSideLength(surfaceArea) {
    return Math.sqrt(surfaceArea);
}

// Function to calculate the surface area from the side length in meters
function calculateSurfaceArea(sideLengthMeters) {
    return sideLengthMeters * sideLengthMeters;
}

// Function to convert meters to degrees (approximation)
function metersToDegrees(meters) {
    const degrees = meters / 111000;
    return degrees;
}

// Initialize the draw control and pass it the FeatureGroup of editable layers
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: editableLayers,
        edit: {
            selectedPathOptions: {
                maintainAspectRatio: true,
                rotate: true,
                transform: true
            }
        },
        remove: true
    },
    draw: false
});
map.addControl(drawControl);

// Function to create a draggable square of the given side length at the specified center
function createDraggableSquare(centerLat, centerLng, sideLengthMeters) {
    const halfSideDegrees = metersToDegrees(sideLengthMeters / 2);
    const southWest = L.latLng(centerLat - halfSideDegrees, centerLng - halfSideDegrees);
    const northEast = L.latLng(centerLat + halfSideDegrees, centerLng + halfSideDegrees);
    const bounds = L.latLngBounds(southWest, northEast);

    const rectangle = L.rectangle(bounds, {
        color: "#0088ff",
        weight: 1,
        interactive: true,
        transform: true
    });

    editableLayers.addLayer(rectangle);

    const center = bounds.getCenter();
    const surfaceArea = calculateSurfaceArea(sideLengthMeters);
    const label = L.marker(center, {
        icon: L.divIcon({
            className: 'label',
            html: `<div style="transform: translate(-50%, -50%); background-color: white; padding: 2px;">Electrolysers: ${surfaceArea.toFixed(2)} m²</div>`,
            iconSize: [150, 40]
        }),
        //interactive: false  // Make the label non-interactive
    }).addTo(editableLayers);

    rectangle.on('edit', function(e) {
        const bounds = e.target.getBounds();
        label.setLatLng(bounds.getCenter());
    });

    rectangle.on('drag', function(e) {
        const bounds = e.target.getBounds();
        label.setLatLng(bounds.getCenter());
    });

    rectangle.on('rotatestart', function(e) {
        console.log('Rotation started:', e);
    });

    rectangle.on('rotate', function(e) {
        console.log('Rotating:', e);
    });

    rectangle.on('rotateend', function(e) {
        console.log('Rotation ended:', e);
    });
}