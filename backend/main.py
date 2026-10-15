
import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

app = FastAPI(title="Traffic Signal Optimization API")

# Allow requests from your live website
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tafficsignalsystem-1.onrender.com"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fuzzy Logic setup
vehicles = ctrl.Antecedent(
    np.arange(0, 101, 1), "vehicles"
)
green_time = ctrl.Consequent(
    np.arange(10, 61, 1), "green_time"
)

vehicles["low"] = fuzz.trimf(vehicles.universe, [0, 0, 40])
vehicles["medium"] = fuzz.trimf(vehicles.universe, [20, 50, 80])
vehicles["high"] = fuzz.trimf(vehicles.universe, [60, 100, 100])

green_time["short"] = fuzz.trimf(green_time.universe, [10, 10, 30])
green_time["medium"] = fuzz.trimf(green_time.universe, [20, 35, 50])
green_time["long"] = fuzz.trimf(green_time.universe, [40, 60, 60])

fuzzy_system = ctrl.ControlSystem([
    ctrl.Rule(vehicles["low"], green_time["short"]),
    ctrl.Rule(vehicles["medium"], green_time["medium"]),
    ctrl.Rule(vehicles["high"], green_time["long"]),
])

def calculate_green_time(count):
    sim = ctrl.ControlSystemSimulation(fuzzy_system)
    sim.input["vehicles"] = count
    sim.compute()
    return round(float(sim.output["green_time"]), 2)

# API input
class TrafficInput(BaseModel):
    north: int = Field(ge=0, le=100)
    south: int = Field(ge=0, le=100)
    east: int = Field(ge=0, le=100)
    west: int = Field(ge=0, le=100)

ROADS = ["North", "South", "East", "West"]
TOTAL_CYCLE = 120
MIN_GREEN = 10
MAX_GREEN = 60

def make_solution():
    times = [MIN_GREEN] * 4
    remaining = TOTAL_CYCLE - sum(times)

    while remaining:
        available = [
            i for i in range(4)
            if times[i] < MAX_GREEN
        ]
        i = random.choice(available)
        times[i] += 1
        remaining -= 1

    return times

def optimize_timings(targets):
    def fitness(solution):
        if sum(solution) != TOTAL_CYCLE:
            return -1e9
        return -sum(
            (actual - target) ** 2
            for actual, target in zip(solution, targets)
        )

    population = [make_solution() for _ in range(50)]

    for _ in range(100):
        population.sort(key=fitness, reverse=True)
        parents = population[:10]
        new_population = parents.copy()

        while len(new_population) < 50:
            child = random.choice(parents).copy()
            a, b = random.sample(range(4), 2)

            if child[a] > MIN_GREEN and child[b] < MAX_GREEN:
                child[a] -= 1
                child[b] += 1

            new_population.append(child)

        population = new_population

    return max(population, key=fitness)

@app.get("/")
def home():
    return {"status": "Traffic Signal API is running"}

@app.post("/optimize")
def optimize(data: TrafficInput):
    traffic = [
        data.north,
        data.south,
        data.east,
        data.west,
    ]

    # Calculate Fuzzy Logic timings
    fuzzy = [calculate_green_time(n) for n in traffic]

    # Scale fuzzy timings to a 120-second cycle
    base = [max(0.01, value - MIN_GREEN) for value in fuzzy]
    available = TOTAL_CYCLE - 4 * MIN_GREEN
    total_base = sum(base)

    targets = [
        MIN_GREEN + available * value / total_base
        for value in base
    ]

    # Genetic Algorithm searches for a valid timing plan
    optimized = optimize_timings(targets)

    return {
        "roads": ROADS,
        "vehicle_counts": traffic,
        "fuzzy_timings": fuzzy,
        "optimized_timings": optimized,
        "total_cycle": sum(optimized),
        "message": "Optimization completed",
    }
