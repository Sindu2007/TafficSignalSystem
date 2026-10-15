const roads = ["north", "south", "east", "west"];

const initialTraffic = {
    north: 15,
    south: 8,
    east: 20,
    west: 5
};

const API_URL = "https://traffic-signal-api-6q9s.onrender.com/optimize";

const runButton = document.getElementById("runButton");
const resetButton = document.getElementById("resetButton");

function getTraffic() {
    const traffic = {};

    roads.forEach(road => {
        traffic[road] = Number(document.getElementById(road).value);

        document.getElementById(road + "Value").textContent =
            traffic[road];
    });

    return traffic;
}

function updateTotal(traffic) {
    const total = Object.values(traffic).reduce(
        (sum, count) => sum + count, 0
    );

    document.getElementById("totalVehicles").textContent = total;
}

function setSignal(activeRoad) {
    roads.forEach(road => {
        const signal = document.getElementById(
            "signal" + road.charAt(0).toUpperCase() + road.slice(1)
        );

        signal.querySelectorAll(".light").forEach(light => {
            light.classList.remove("active");
        });

        const color = road === activeRoad ? "green" : "red";
        signal.querySelector("." + color).classList.add("active");
    });
}

function resetSignals() {
    roads.forEach(road => {
        const signal = document.getElementById(
            "signal" + road.charAt(0).toUpperCase() + road.slice(1)
        );

        signal.querySelectorAll(".light").forEach(light => {
            light.classList.remove("active");
        });

        signal.querySelector(".red").classList.add("active");
    });
}

function updateDashboard() {
    const traffic = getTraffic();
    updateTotal(traffic);

    document.getElementById("message").textContent =
        "Traffic inputs updated. Click Run Optimization to calculate signal timings.";
}

async function runOptimization() {
    const traffic = getTraffic();

    const total = Object.values(traffic).reduce(
        (sum, count) => sum + count, 0
    );

    if (total === 0) {
        document.getElementById("message").textContent =
            "No vehicles detected. Add traffic to at least one road.";
        return;
    }

    runButton.disabled = true;
    runButton.textContent = "Optimizing...";

    document.getElementById("message").textContent =
        "Sending traffic data to the Python Fuzzy Logic + GA backend...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(traffic)
        });

        if (!response.ok) {
            throw new Error("Backend returned HTTP " + response.status);
        }

        const result = await response.json();

        const fuzzy = result.fuzzy_timings;
        const optimized = result.optimized_timings;

        if (
            !Array.isArray(fuzzy) ||
            !Array.isArray(optimized) ||
            fuzzy.length !== 4 ||
            optimized.length !== 4
        ) {
            throw new Error("Unexpected response from backend.");
        }

        // Highlight the road assigned the longest green time by GA.
        const busiestIndex = optimized.indexOf(Math.max(...optimized));
        const activeRoad = roads[busiestIndex];

        setSignal(activeRoad);

        // Show average traffic count, not a measured waiting time.
        document.getElementById("queueLength").textContent =
            (total / roads.length).toFixed(2);

        // The API does not calculate actual waiting time or queue reduction.
        document.getElementById("waitingTime").textContent = "N/A";
        document.getElementById("queueReduction").textContent = "N/A";

        const timingDetails = roads.map((road, index) => {
            return road.toUpperCase() +
                ": Fuzzy " + Number(fuzzy[index]).toFixed(2) +
                "s, GA " + Number(optimized[index]).toFixed(0) + "s";
        }).join(" | ");

        document.getElementById("message").textContent =
            "Optimization completed! " +
            timingDetails +
            ". Total cycle: " + result.total_cycle +
            " seconds. Longest green allocation: " +
            activeRoad.toUpperCase() + ".";

    } catch (error) {
        console.error("Optimization error:", error);

        document.getElementById("message").textContent =
            "Could not connect to the optimization API. " +
            "Please check that the backend is Live and try again.";
    } finally {
        runButton.disabled = false;
        runButton.textContent = "Run Optimization";
    }
}

roads.forEach(road => {
    document.getElementById(road).addEventListener(
        "input",
        updateDashboard
    );
});

runButton.addEventListener("click", runOptimization);

resetButton.addEventListener("click", () => {
    roads.forEach(road => {
        document.getElementById(road).value = initialTraffic[road];
    });

    resetSignals();

    document.getElementById("waitingTime").textContent = "N/A";
    document.getElementById("queueLength").textContent = "12.00";
    document.getElementById("queueReduction").textContent = "N/A";

    updateDashboard();

    document.getElementById("message").textContent =
        "Traffic inputs reset. Ready for a new optimization.";
});

updateDashboard();
