
const roads = ["north", "south", "east", "west"];

const initialTraffic = {
    north: 15,
    south: 8,
    east: 20,
    west: 5
};

const runButton = document.getElementById("runButton");
const resetButton = document.getElementById("resetButton");

function getTraffic() {
    const traffic = {};

    roads.forEach(road => {
        traffic[road] = Number(
            document.getElementById(road).value
        );

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

function updateDashboard() {
    const traffic = getTraffic();
    updateTotal(traffic);

    // Initial demonstration state
    document.getElementById("message").textContent =
        "Traffic inputs updated. Run the demo to see a signal change.";
}

function runDemo() {
    const traffic = getTraffic();

    const total = Object.values(traffic).reduce(
        (sum, count) => sum + count, 0
    );

    if (total === 0) {
        document.getElementById("message").textContent =
            "No vehicles in the simulation. Add traffic to a road first.";
        return;
    }

    const busiestRoad = roads.reduce((best, road) =>
        traffic[road] > traffic[best] ? road : best
    , roads[0]);

    setSignal(busiestRoad);

    // Illustrative formula only, not a real GA or fuzzy controller.
    const averageQueue = total / roads.length;
    const demoWaitingTime = (
        1 + averageQueue / 4
    ).toFixed(2);

    document.getElementById("waitingTime").innerHTML =
        demoWaitingTime + ' <small>demo units*</small>';

    document.getElementById("queueLength").textContent =
        averageQueue.toFixed(2);

    document.getElementById("queueReduction").textContent =
        "—";

    document.getElementById("message").textContent =
        "Demo only: " + busiestRoad.toUpperCase() +
        " road has the highest vehicle count (" +
        traffic[busiestRoad] +
        "). Its green light is highlighted. " +
        "This is not yet the Python Fuzzy + GA algorithm.";
}

roads.forEach(road => {
    document.getElementById(road).addEventListener(
        "input", updateDashboard
    );
});

runButton.addEventListener("click", runDemo);

resetButton.addEventListener("click", () => {
    roads.forEach(road => {
        document.getElementById(road).value =
            initialTraffic[road];
    });

    roads.forEach(road => {
        const signal = document.getElementById(
            "signal" + road.charAt(0).toUpperCase() + road.slice(1)
        );

        signal.querySelectorAll(".light").forEach(light => {
            light.classList.remove("active");
        });

        signal.querySelector(".red").classList.add("active");
    });

    document.getElementById("waitingTime").innerHTML =
        '5.00 <small>min*</small>';

    document.getElementById("queueLength").textContent =
        "5.00";

    document.getElementById("queueReduction").textContent =
        "30.17%";

    updateDashboard();

    document.getElementById("message").textContent =
        "Traffic inputs reset. Initial demo values restored.";
});

updateDashboard();
