const API_URL = window.location.protocol === "file:"
    ? "http://127.0.0.1:8001"
    : window.location.origin;

const elements = {
    automatonInput: document.querySelector("#automaton"),
    automatonFileInput: document.querySelector("#automaton-file"),
    wordInput: document.querySelector("#word"),
    wordList: document.querySelector("#word-list"),
    simulateButton: document.querySelector("#simulate"),
    simulateAllButton: document.querySelector("#simulate-all"),
    resultSection: document.querySelector("#result-section"),
    result: document.querySelector("#result"),
    verdictDetails: document.querySelector("#verdict-details"),
    steps: document.querySelector("#steps"),
    timeline: document.querySelector("#timeline-track"),
    allResultsSection: document.querySelector("#all-results-section"),
    allResults: document.querySelector("#all-results"),
    errorSection: document.querySelector("#error-section"),
    error: document.querySelector("#error"),
    automatonContainer: document.querySelector("#automaton-container"),
    automatonSvg: document.querySelector("#automaton-svg"),
    previousStepButton: document.querySelector("#previous-step"),
    nextStepButton: document.querySelector("#next-step"),
    stepIndicator: document.querySelector("#step-indicator"),
    stepDetails: document.querySelector("#step-details"),
    stateCount: document.querySelector("#state-count"),
    diagramCaption: document.querySelector("#diagram-caption")
};

const defaultAutomaton = {
    states: ["q0", "q1", "q2"],
    alphabet: ["a", "b"],
    initial_state: "q0",
    final_states: ["q2"],
    transitions: {
        q0: { a: ["q0"], "ε": ["q1"] },
        q1: { b: ["q2"] },
        q2: {}
    }
};

let currentSimulation = null;
let currentStepIndex = 0;
let currentAutomaton = defaultAutomaton;
let renderedAutomaton = defaultAutomaton;
let loadedWords = [];
let resizeFrame = null;

elements.automatonInput.value = JSON.stringify(defaultAutomaton, null, 2);
drawAutomaton(defaultAutomaton);
updateStateCount(defaultAutomaton);

elements.simulateButton.addEventListener("click", simulate);
elements.simulateAllButton.addEventListener("click", simulateAll);
elements.automatonFileInput.addEventListener("change", loadAutomatonFile);
elements.wordList.addEventListener("change", () => {
    elements.wordInput.value = elements.wordList.value;
});
elements.previousStepButton.addEventListener("click", () => changeStep(-1));
elements.nextStepButton.addEventListener("click", () => changeStep(1));

if ("ResizeObserver" in window) {
    const diagramObserver = new ResizeObserver(() => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => drawAutomaton(renderedAutomaton));
    });
    diagramObserver.observe(elements.automatonContainer);
}

function changeStep(offset) {
    if (!currentSimulation) return;
    const lastIndex = currentSimulation.steps.length - 1;
    currentStepIndex = Math.max(0, Math.min(lastIndex, currentStepIndex + offset));
    renderCurrentStep();
}

async function simulate() {
    clearOutput();

    try {
        const automaton = readAutomaton();
        currentAutomaton = automaton;
        drawAutomaton(automaton);
        updateStateCount(automaton);
        const result = await requestSimulation(automaton, elements.wordInput.value);
        showResult(result);
    } catch (error) {
        showError(error.message);
    }
}

async function simulateAll() {
    clearOutput();

    if (loadedWords.length === 0) {
        showError("O arquivo não possui palavras para simulação.");
        return;
    }

    try {
        const automaton = readAutomaton();
        currentAutomaton = automaton;
        drawAutomaton(automaton);
        updateStateCount(automaton);

        const results = [];
        for (const word of loadedWords) {
            results.push(await requestSimulation(automaton, word));
        }
        showAllResults(results);
    } catch (error) {
        showError(error.message);
    }
}

function readAutomaton() {
    try {
        return JSON.parse(elements.automatonInput.value);
    } catch {
        throw new Error("A definição do autômato não contém um JSON válido.");
    }
}

async function requestSimulation(automaton, word) {
    const response = await fetch(`${API_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automaton, word })
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail ?? "Erro durante a simulação.");
    }
    return data;
}

function showResult(data) {
    currentSimulation = normalizeSimulationResult(data, currentAutomaton);
    data = currentSimulation;
    currentStepIndex = 0;
    elements.resultSection.hidden = false;

    renderStepsList(data);
    createTimeline(data);
    renderCurrentStep();
}

function normalizeSimulationResult(data, automaton) {
    let previousActiveStates = [];
    const normalizedSteps = (data.steps ?? []).map((step, index) => {
        const activeStates = [...(step.active_states ?? [])];
        const symbol = step.symbol ?? null;
        let directStates;
        let consumedTransitions;

        if (index === 0 || symbol === null) {
            directStates = [automaton.initial_state];
            consumedTransitions = [];
        } else {
            consumedTransitions = collectSymbolTransitions(
                automaton,
                previousActiveStates,
                symbol
            );
            directStates = uniqueSorted(
                consumedTransitions.map((transition) => transition.target)
            );
        }

        const closureTrace = collectEpsilonClosure(automaton, directStates);
        const normalized = {
            ...step,
            symbol,
            active_states: activeStates,
            direct_states: step.direct_states ?? directStates,
            epsilon_states: step.epsilon_states
                ?? activeStates.filter((state) => !directStates.includes(state)),
            consumed_transitions: step.consumed_transitions ?? consumedTransitions,
            epsilon_transitions: step.epsilon_transitions ?? closureTrace.transitions
        };
        previousActiveStates = activeStates;
        return normalized;
    });

    const finalActiveStates = data.final_active_states
        ?? normalizedSteps.at(-1)?.active_states
        ?? [];
    const acceptingStates = data.accepting_states
        ?? finalActiveStates.filter((state) => automaton.final_states.includes(state));

    return {
        ...data,
        steps: normalizedSteps,
        final_active_states: finalActiveStates,
        accepting_states: uniqueSorted(acceptingStates)
    };
}

function collectSymbolTransitions(automaton, sourceStates, symbol) {
    const transitions = [];
    sourceStates.forEach((source) => {
        const targets = automaton.transitions?.[source]?.[symbol] ?? [];
        targets.forEach((target) => transitions.push({ source, symbol, target }));
    });
    return uniqueTransitions(transitions);
}

function collectEpsilonClosure(automaton, seedStates) {
    const closure = new Set(seedStates);
    const stack = [...seedStates];
    const transitions = [];

    while (stack.length > 0) {
        const source = stack.pop();
        const targets = automaton.transitions?.[source]?.["ε"] ?? [];
        targets.forEach((target) => {
            transitions.push({ source, symbol: "ε", target });
            if (!closure.has(target)) {
                closure.add(target);
                stack.push(target);
            }
        });
    }
    return {
        states: uniqueSorted([...closure]),
        transitions: uniqueTransitions(transitions)
    };
}

function uniqueTransitions(transitions) {
    const seen = new Set();
    return transitions.filter((transition) => {
        const key = `${transition.source}\u0000${transition.symbol}\u0000${transition.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((first, second) =>
        first.source.localeCompare(second.source)
        || first.symbol.localeCompare(second.symbol)
        || first.target.localeCompare(second.target)
    );
}

function uniqueSorted(states) {
    return [...new Set(states)].sort();
}

function renderVerdict(data, step, isLastStep) {
    const conclusion = elements.steps.querySelector(".steps-conclusion");
    if (conclusion) conclusion.hidden = !isLastStep;

    if (!isLastStep) {
        const stepContext = step.symbol === null
            ? `Passo ${currentStepIndex} · configuração inicial`
            : `Passo ${currentStepIndex} · símbolo "${escapeHtml(step.symbol)}"`;
        const directStates = escapeHtml(formatStates(step.direct_states));
        const closureStates = escapeHtml(formatStates(step.active_states));

        elements.result.textContent = "FECHO-ε ATUAL";
        elements.result.className = "result-pending";
        elements.verdictDetails.innerHTML = `
            <div class="verdict-step-context">${stepContext}</div>
            <div class="current-closure">fecho-ε(${directStates}) = <strong>${closureStates}</strong></div>
        `;
        return;
    }

    elements.result.textContent = data.accepted ? "ACEITA" : "REJEITADA";
    elements.result.className = data.accepted ? "result-accepted" : "result-rejected";

    const finalActive = formatStates(data.final_active_states);
    const finalStates = formatStates(currentAutomaton.final_states);
    const intersection = formatStates(data.accepting_states);
    const reason = data.accepted
        ? "A interseção não é vazia."
        : "A interseção é vazia.";

    elements.verdictDetails.innerHTML = `
        <div class="verdict-row"><span>Estados ativos finais</span><strong>${escapeHtml(finalActive)}</strong></div>
        <div class="verdict-row"><span>Estados finais F</span><strong>${escapeHtml(finalStates)}</strong></div>
        <div class="verdict-intersection">${escapeHtml(finalActive)} ∩ ${escapeHtml(finalStates)} = ${escapeHtml(intersection)}</div>
        <p class="verdict-reason">${reason}</p>
    `;
}

function renderStepsList(data) {
    elements.steps.innerHTML = "";

    data.steps.forEach((step, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "step-item";
        item.dataset.step = index;
        item.textContent = step.symbol === null
            ? `0. Fecho-ε inicial: ${formatStates(step.active_states)}`
            : `${index}. Lê "${step.symbol}": ${formatStates(step.active_states)}`;
        item.addEventListener("click", () => {
            currentStepIndex = index;
            renderCurrentStep();
        });
        elements.steps.appendChild(item);
    });

    const conclusion = document.createElement("div");
    conclusion.className = "steps-conclusion";
    conclusion.hidden = true;
    const finalActive = formatStates(data.final_active_states);
    const finalStates = formatStates(currentAutomaton.final_states);
    const intersection = formatStates(data.accepting_states);
    conclusion.textContent = `${data.accepted ? "ACEITA" : "REJEITADA"}: estados ativos finais = ${finalActive}; F = ${finalStates}; ${finalActive} ∩ ${finalStates} = ${intersection} (${data.accepted ? "interseção não vazia" : "interseção vazia"}).`;
    elements.steps.appendChild(conclusion);
}

function createTimeline(data) {
    elements.timeline.innerHTML = "";

    data.steps.forEach((step, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "timeline-node";
        item.textContent = index;
        item.title = step.symbol === null ? "Fecho-ε inicial" : `Símbolo "${step.symbol}"`;
        item.setAttribute("aria-label", item.title);
        item.addEventListener("click", () => {
            currentStepIndex = index;
            renderCurrentStep();
        });
        elements.timeline.appendChild(item);
    });
}

function renderCurrentStep() {
    if (!currentSimulation) return;

    const step = currentSimulation.steps[currentStepIndex];
    const lastIndex = currentSimulation.steps.length - 1;

    const isLastStep = currentStepIndex === lastIndex;
    applyStepVisualization(step, isLastStep);
    renderVerdict(currentSimulation, step, isLastStep);
    elements.stepIndicator.textContent = `Passo ${currentStepIndex} de ${lastIndex}`;
    elements.previousStepButton.disabled = currentStepIndex === 0;
    elements.nextStepButton.disabled = currentStepIndex === lastIndex;
    elements.diagramCaption.textContent = `Estado atual: ${formatStates(getCurrentStates(step))}. Alcançáveis: ${formatStates(step.direct_states)}. Acrescentados por ε: ${formatStates(step.epsilon_states)}.`;

    elements.timeline.querySelectorAll(".timeline-node").forEach((node, index) => {
        node.classList.toggle("current", index === currentStepIndex);
        node.classList.toggle("completed", index < currentStepIndex);
    });
    elements.steps.querySelectorAll(".step-item").forEach((item, index) => {
        item.classList.toggle("current", index === currentStepIndex);
    });

    const previousStates = currentStepIndex === 0
        ? [currentAutomaton.initial_state]
        : currentSimulation.steps[currentStepIndex - 1].active_states;
    const movementTitle = step.symbol === null
        ? "Estado inicial"
        : `Transições pelo símbolo "${escapeHtml(step.symbol)}"`;
    const movementContent = step.symbol === null
        ? `<div class="state-set">Estado inicial: <strong>${escapeHtml(formatStates(step.direct_states))}</strong></div>`
        : `
            <div class="state-set">Estados ativos antes da leitura: <strong>${escapeHtml(formatStates(previousStates))}</strong></div>
            ${formatTransitionList(step.consumed_transitions, "Nenhuma transição disponível para o símbolo.")}
            <div class="state-set">Destinos diretos: <strong>${escapeHtml(formatStates(step.direct_states))}</strong></div>
        `;

    elements.stepDetails.innerHTML = `
        <div class="step-detail-header">${movementTitle}</div>
        ${movementContent}
        <div class="closure-detail">
            <strong>Fecho-ε</strong>
            ${formatTransitionList(step.epsilon_transitions, "Nenhuma transição ε adicional.")}
            <div class="state-set">Acrescentados por ε: <strong>${escapeHtml(formatStates(step.epsilon_states))}</strong></div>
        </div>
        <div class="state-set result-set">Estados ativos resultantes: <strong>${escapeHtml(formatStates(step.active_states))}</strong></div>
    `;
}

function formatTransitionList(transitions, emptyMessage) {
    if (!transitions || transitions.length === 0) {
        return `<p class="empty-transition">${emptyMessage}</p>`;
    }

    const items = transitions.map((transition) => `
        <li>${escapeHtml(transition.source)} —${escapeHtml(transition.symbol)}→ ${escapeHtml(transition.target)}</li>
    `).join("");
    return `<ul class="transition-list">${items}</ul>`;
}

async function loadAutomatonFile(event) {
    clearOutput();
    const file = event.target.files[0];
    if (!file) return;

    try {
        const data = JSON.parse(await file.text());
        elements.automatonInput.value = JSON.stringify(data, null, 2);
        loadWords(data.words ?? []);
        currentAutomaton = data;
        drawAutomaton(data);
        updateStateCount(data);
    } catch {
        showError("Não foi possível carregar o arquivo JSON.");
    } finally {
        event.target.value = "";
    }
}

function loadWords(words) {
    loadedWords = words;
    elements.wordList.innerHTML = "";

    const manualOption = document.createElement("option");
    manualOption.value = "";
    manualOption.textContent = "Digitar manualmente";
    elements.wordList.appendChild(manualOption);

    words.forEach((word) => {
        const option = document.createElement("option");
        option.value = word;
        option.textContent = word === "" ? "ε (palavra vazia)" : word;
        elements.wordList.appendChild(option);
    });
}

function showAllResults(results) {
    elements.allResultsSection.hidden = false;
    elements.allResults.innerHTML = "";

    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Palavra</th><th>Resultado</th><th>Estados ativos finais</th></tr></thead>";
    const tbody = document.createElement("tbody");

    results.forEach((result) => {
        const row = document.createElement("tr");
        const wordCell = document.createElement("td");
        const statusCell = document.createElement("td");
        const statesCell = document.createElement("td");
        const status = document.createElement("span");

        wordCell.textContent = result.word === "" ? "ε" : result.word;
        status.className = `status-pill ${result.accepted ? "status-accepted" : "status-rejected"}`;
        status.textContent = result.accepted ? "ACEITA" : "REJEITADA";
        statesCell.textContent = formatStates(result.final_active_states);
        statusCell.appendChild(status);
        row.append(wordCell, statusCell, statesCell);
        row.addEventListener("click", () => {
            showResult(result);
            elements.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    elements.allResults.appendChild(table);
}

function showError(message) {
    elements.errorSection.hidden = false;
    elements.error.textContent = message;
}

function clearOutput() {
    elements.resultSection.hidden = true;
    elements.allResultsSection.hidden = true;
    elements.errorSection.hidden = true;
    elements.result.textContent = "";
    elements.result.className = "";
    elements.verdictDetails.textContent = "";
    elements.steps.innerHTML = "";
    elements.timeline.innerHTML = "";
    elements.allResults.innerHTML = "";
    elements.error.textContent = "";
    currentSimulation = null;
    currentStepIndex = 0;
    resetDiagramVisualization();
}

function updateStateCount(automaton) {
    const amount = automaton.states.length;
    elements.stateCount.textContent = amount === 1 ? "1 estado" : `${amount} estados`;
}

function drawAutomaton(automaton) {
    if (!automaton?.states?.length) return;
    renderedAutomaton = automaton;

    const width = Math.max(elements.automatonContainer.clientWidth, 280);
    const minimumGraphHeight = automaton.states.length >= 3 ? 360 : 300;
    const height = Math.min(520, Math.max(minimumGraphHeight, width * 0.55, automaton.states.length * 80));
    const svg = elements.automatonSvg;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.height = `${height}px`;

    addDiagramDefinitions(svg);
    const positions = calculateStatePositions(automaton, width, height);
    drawTransitions(automaton, positions, width, height);
    drawInitialArrow(automaton, positions);
    drawStates(automaton, positions);

    if (currentSimulation) {
        const lastIndex = currentSimulation.steps.length - 1;
        applyStepVisualization(
            currentSimulation.steps[currentStepIndex],
            currentStepIndex === lastIndex
        );
    }
}

function addDiagramDefinitions(svg) {
    const defs = createSvgElement("defs");
    [
        ["arrow-default", "#8c98a5"],
        ["arrow-current", "#0787e8"],
        ["arrow-epsilon", "#79bceb"],
        ["arrow-rejected", "#e44747"]
    ].forEach(([id, color]) => {
        const marker = createSvgElement("marker", {
            id,
            viewBox: "0 0 10 10",
            refX: 9,
            refY: 5,
            markerWidth: 9,
            markerHeight: 9,
            orient: "auto-start-reverse"
        });
        marker.appendChild(createSvgElement("path", {
            d: "M 0 0 L 10 5 L 0 10 z",
            fill: color
        }));
        defs.appendChild(marker);
    });
    svg.appendChild(defs);
}

function calculateStatePositions(automaton, width, height) {
    const orderedStates = optimizeStateOrder(automaton);
    const positions = {};
    const centerX = width / 2;
    const centerY = height / 2;

    if (orderedStates.length === 1) {
        positions[orderedStates[0]] = { x: centerX, y: centerY };
        return positions;
    }

    if (orderedStates.length === 2) {
        const radiusX = Math.max(40, width / 2 - 105);
        positions[orderedStates[0]] = { x: centerX - radiusX, y: centerY };
        positions[orderedStates[1]] = { x: centerX + radiusX, y: centerY };
        return positions;
    }

    const radiusX = Math.max(40, width / 2 - 105);
    const radiusY = Math.max(45, height / 2 - 120);
    orderedStates.forEach((state, index) => {
        const angle = Math.PI + (index * Math.PI * 2) / orderedStates.length;
        positions[state] = {
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY
        };
    });
    return positions;
}

function optimizeStateOrder(automaton) {
    const initialOrder = [
        automaton.initial_state,
        ...automaton.states.filter((state) => state !== automaton.initial_state)
    ];
    if (initialOrder.length < 4 || initialOrder.length > 18) return initialOrder;

    const edges = [];
    Object.entries(automaton.transitions).forEach(([source, transitions]) => {
        Object.values(transitions).forEach((targets) => {
            targets.forEach((target) => {
                if (source !== target && !edges.some(([a, b]) => a === source && b === target)) {
                    edges.push([source, target]);
                }
            });
        });
    });

    let order = [...initialOrder];
    let score = circularLayoutScore(order, edges);
    const maximumPasses = order.length * 3;

    for (let pass = 0; pass < maximumPasses; pass++) {
        let bestOrder = order;
        let bestScore = score;

        for (let first = 1; first < order.length - 1; first++) {
            for (let second = first + 1; second < order.length; second++) {
                const candidate = [...order];
                [candidate[first], candidate[second]] = [candidate[second], candidate[first]];
                const candidateScore = circularLayoutScore(candidate, edges);
                if (candidateScore < bestScore) {
                    bestOrder = candidate;
                    bestScore = candidateScore;
                }
            }
        }

        if (bestScore >= score) break;
        order = bestOrder;
        score = bestScore;
    }
    return order;
}

function circularLayoutScore(order, edges) {
    const positions = new Map(order.map((state, index) => [state, index]));
    const size = order.length;
    let crossings = 0;
    let spanPenalty = 0;

    edges.forEach(([source, target]) => {
        const distance = Math.abs(positions.get(source) - positions.get(target));
        const circularDistance = Math.min(distance, size - distance);
        spanPenalty += circularDistance * circularDistance;
    });

    for (let first = 0; first < edges.length - 1; first++) {
        for (let second = first + 1; second < edges.length; second++) {
            if (chordsCross(edges[first], edges[second], positions, size)) crossings++;
        }
    }
    return crossings * 1000 + spanPenalty * 4;
}

function chordsCross(firstEdge, secondEdge, positions, size) {
    const [firstSource, firstTarget] = firstEdge;
    const [secondSource, secondTarget] = secondEdge;
    if (new Set([firstSource, firstTarget, secondSource, secondTarget]).size < 4) return false;

    const a = positions.get(firstSource);
    const b = positions.get(firstTarget);
    const c = positions.get(secondSource);
    const d = positions.get(secondTarget);
    const isBetween = (point, start, end) => {
        const span = (end - start + size) % size;
        const offset = (point - start + size) % size;
        return offset > 0 && offset < span;
    };
    return isBetween(c, a, b) !== isBetween(d, a, b)
        && isBetween(a, c, d) !== isBetween(b, c, d);
}

function drawStates(automaton, positions) {
    automaton.states.forEach((state) => {
        const position = positions[state];
        if (!position) return;

        const group = createSvgElement("g", {
            class: `state${automaton.final_states.includes(state) ? " final" : ""}`,
            "data-state": state
        });
        group.appendChild(createSvgElement("circle", { cx: position.x, cy: position.y, r: 35 }));
        if (automaton.final_states.includes(state)) {
            group.appendChild(createSvgElement("circle", { cx: position.x, cy: position.y, r: 29 }));
        }
        const label = createSvgElement("text", {
            x: position.x,
            y: position.y,
            "text-anchor": "middle",
            "dominant-baseline": "middle"
        });
        label.textContent = state;
        group.appendChild(label);
        elements.automatonSvg.appendChild(group);
    });
}

function drawInitialArrow(automaton, positions) {
    const position = positions[automaton.initial_state];
    if (!position) return;

    elements.automatonSvg.appendChild(createSvgElement("line", {
        x1: Math.max(8, position.x - 90),
        y1: position.y,
        x2: position.x - 42,
        y2: position.y,
        class: "transition initial-arrow",
        "data-initial-arrow": "true",
        "marker-end": "url(#arrow-default)"
    }));
}

function drawTransitions(automaton, positions, width, height) {
    const groupedEdges = new Map();

    Object.entries(automaton.transitions).forEach(([source, transitions]) => {
        Object.entries(transitions).forEach(([symbol, targets]) => {
            targets.forEach((target) => {
                const key = `${source}\u0000${target}`;
                if (!groupedEdges.has(key)) groupedEdges.set(key, { source, target, symbols: [] });
                const edge = groupedEdges.get(key);
                if (!edge.symbols.includes(symbol)) edge.symbols.push(symbol);
            });
        });
    });

    groupedEdges.forEach((edge) => {
        if (edge.source === edge.target) {
            drawLoop(edge, positions, width, height, automaton.initial_state);
            return;
        }
        const reciprocalKey = `${edge.target}\u0000${edge.source}`;
        drawEdge(edge, positions, groupedEdges.has(reciprocalKey), width, height);
    });
}

function drawEdge(edge, positions, isReciprocal, width, height) {
    const from = positions[edge.source];
    const to = positions[edge.target];
    if (!from || !to) return;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance;
    const uy = dy / distance;
    const start = { x: from.x + ux * 36, y: from.y + uy * 36 };
    const end = { x: to.x - ux * 42, y: to.y - uy * 42 };
    const normalX = -uy;
    const normalY = ux;
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const curvature = Math.min(96, Math.max(18, distance * 0.16));
    const candidates = [1, -1].map((direction) => ({
        direction,
        x: midpoint.x + normalX * curvature * direction,
        y: midpoint.y + normalY * curvature * direction
    }));
    const center = { x: width / 2, y: height / 2 };
    const distanceFromCenter = (point) => Math.hypot(point.x - center.x, point.y - center.y);
    let control;

    if (isReciprocal) {
        control = candidates[0];
    } else {
        control = distanceFromCenter(candidates[0]) >= distanceFromCenter(candidates[1])
            ? candidates[0]
            : candidates[1];
    }

    const pathData = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
    const labelX = (start.x + 2 * control.x + end.x) / 4 + normalX * control.direction * 8;
    const labelY = (start.y + 2 * control.y + end.y) / 4 + normalY * control.direction * 8;
    const group = createTransitionGroup(edge);
    group.appendChild(createSvgElement("path", {
        d: pathData,
        class: "transition",
        fill: "none",
        "marker-end": "url(#arrow-default)"
    }));
    drawTransitionLabel(edge.symbols.join(", "), labelX, labelY, group);
    elements.automatonSvg.appendChild(group);
}

function drawLoop(edge, positions, width, height, initialState) {
    const state = positions[edge.source];
    const center = { x: width / 2, y: height / 2 };
    let outwardX = state.x - center.x;
    let outwardY = state.y - center.y;
    const outwardLength = Math.hypot(outwardX, outwardY);

    if (edge.source === initialState || outwardLength < 1) {
        outwardX = 0;
        outwardY = -1;
    } else {
        outwardX /= outwardLength;
        outwardY /= outwardLength;
    }

    const perpendicularX = -outwardY;
    const perpendicularY = outwardX;
    const start = {
        x: state.x + outwardX * 20 + perpendicularX * 28,
        y: state.y + outwardY * 20 + perpendicularY * 28
    };
    const end = {
        x: state.x + outwardX * 20 - perpendicularX * 28,
        y: state.y + outwardY * 20 - perpendicularY * 28
    };
    const control1 = {
        x: start.x + outwardX * 65 + perpendicularX * 18,
        y: start.y + outwardY * 65 + perpendicularY * 18
    };
    const control2 = {
        x: end.x + outwardX * 65 - perpendicularX * 18,
        y: end.y + outwardY * 65 - perpendicularY * 18
    };

    const group = createTransitionGroup(edge);
    group.appendChild(createSvgElement("path", {
        d: `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
        class: "transition",
        fill: "none",
        "marker-end": "url(#arrow-default)"
    }));
    drawTransitionLabel(
        edge.symbols.join(", "),
        state.x + outwardX * 88,
        state.y + outwardY * 88,
        group
    );
    elements.automatonSvg.appendChild(group);
}

function createTransitionGroup(edge) {
    return createSvgElement("g", {
        class: "transition-group",
        "data-source": edge.source,
        "data-target": edge.target,
        "data-symbols": JSON.stringify(edge.symbols)
    });
}

function drawTransitionLabel(text, x, y, parent) {
    const label = createSvgElement("text", {
        x,
        y,
        class: "transition-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle"
    });
    label.textContent = text;
    parent.appendChild(label);
}

function applyStepVisualization(step, isLastStep) {
    resetDiagramVisualization();
    const rejected = isLastStep && !currentSimulation.accepted;
    const activeStates = new Set(step.active_states);
    const currentStates = new Set(getCurrentStates(step));
    const reachableStates = new Set(step.direct_states);
    const epsilonStates = new Set(step.epsilon_states);
    const consumedKeys = transitionKeySet(step.consumed_transitions);
    const epsilonKeys = transitionKeySet(step.epsilon_transitions);

    elements.automatonSvg.querySelectorAll(".state").forEach((stateElement) => {
        const state = stateElement.dataset.state;
        if (rejected && activeStates.has(state)) {
            stateElement.classList.add("rejected");
        } else if (currentStates.has(state)) {
            stateElement.classList.add("current-state");
        } else if (reachableStates.has(state)) {
            stateElement.classList.add("reachable-state");
        } else if (epsilonStates.has(state)) {
            stateElement.classList.add("epsilon-active");
        }
    });

    elements.automatonSvg.querySelectorAll(".transition-group").forEach((group) => {
        const matchesConsumed = groupMatchesTransition(group, consumedKeys);
        const matchesEpsilon = groupMatchesTransition(group, epsilonKeys);
        let visualClass = "dimmed";
        let marker = "arrow-default";

        if (matchesConsumed) {
            visualClass = rejected ? "rejected-transition" : "current-transition";
            marker = rejected ? "arrow-rejected" : "arrow-current";
        } else if (matchesEpsilon) {
            visualClass = rejected ? "rejected-transition" : "epsilon-transition";
            marker = rejected ? "arrow-rejected" : "arrow-epsilon";
        }
        group.classList.add(visualClass);
        group.querySelector(".transition").setAttribute("marker-end", `url(#${marker})`);
    });

    const initialArrow = elements.automatonSvg.querySelector(".initial-arrow");
    if (initialArrow) {
        if (step.symbol === null) {
            initialArrow.classList.add("current-transition");
            initialArrow.setAttribute("marker-end", "url(#arrow-current)");
        } else {
            initialArrow.classList.add("dimmed");
        }
    }

    if (rejected && step.active_states.length === 0) {
        drawEmptyState();
    }
}

function getCurrentStates(step) {
    if (step.symbol === null) return [currentAutomaton.initial_state];
    return [...new Set(
        (step.consumed_transitions ?? []).map((transition) => transition.source)
    )].sort();
}

function resetDiagramVisualization() {
    elements.automatonSvg.querySelector(".virtual-empty")?.remove();
    elements.automatonSvg.querySelectorAll(".state").forEach((stateElement) => {
        stateElement.classList.remove("current-state", "reachable-state", "epsilon-active", "rejected");
    });
    elements.automatonSvg.querySelectorAll(".transition-group").forEach((group) => {
        group.classList.remove("dimmed", "current-transition", "epsilon-transition", "rejected-transition");
        group.querySelector(".transition")?.setAttribute("marker-end", "url(#arrow-default)");
    });
    const initialArrow = elements.automatonSvg.querySelector(".initial-arrow");
    if (initialArrow) {
        initialArrow.classList.remove("dimmed", "current-transition", "rejected-transition");
        initialArrow.setAttribute("marker-end", "url(#arrow-default)");
    }
}

function transitionKeySet(transitions) {
    return new Set((transitions ?? []).map((transition) =>
        `${transition.source}\u0000${transition.symbol}\u0000${transition.target}`
    ));
}

function groupMatchesTransition(group, keys) {
    const source = group.dataset.source;
    const target = group.dataset.target;
    const symbols = JSON.parse(group.dataset.symbols);
    return symbols.some((symbol) => keys.has(`${source}\u0000${symbol}\u0000${target}`));
}

function drawEmptyState() {
    const viewBox = elements.automatonSvg.viewBox.baseVal;
    const group = createSvgElement("g", {
        class: "state virtual-empty rejected",
        "data-state": "∅"
    });
    group.appendChild(createSvgElement("circle", {
        cx: viewBox.width / 2,
        cy: viewBox.height / 2,
        r: 35
    }));
    const label = createSvgElement("text", {
        x: viewBox.width / 2,
        y: viewBox.height / 2,
        "text-anchor": "middle",
        "dominant-baseline": "middle"
    });
    label.textContent = "∅";
    group.appendChild(label);
    elements.automatonSvg.appendChild(group);
}

function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
}

function formatStates(states) {
    return !states || states.length === 0 ? "{}" : `{${states.join(", ")}}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
