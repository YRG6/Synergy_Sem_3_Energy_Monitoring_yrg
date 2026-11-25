
import random
import time
from datetime import datetime, timedelta

import requests
from getpass import getpass

from config import API_BASE_URL, HISTORICAL_DAYS, READINGS_PER_DAY


def login():
    print("\n--- Synergy Historical Data Generator ---")

    email = input("Enter your Synergy login email: ")
    password = getpass("Enter your Synergy password: ")

    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={
            "email": email,
            "password": password
        },
        timeout=15
    )

    response.raise_for_status()

    token = response.json().get("token")

    if not token:
        raise Exception("Login succeeded, but no token was returned.")

    print("\nLogin successful!")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def generate_reading():
    # Normal voltage with occasional unusual values
    voltage = random.uniform(220, 240)

    if random.random() < 0.02:
        voltage = random.choice([
            random.uniform(195, 206),
            random.uniform(254, 260)
        ])

    # Simulate changing appliance loads
    current = random.uniform(0.5, 4.5)

    # Occasional high load
    if random.random() < 0.04:
        current = random.uniform(5.1, 7.0)

    # Power factor approximation
    power = voltage * current * random.uniform(0.90, 0.99)

    # Energy consumed during one hour, in kWh
    energy = power / 1000

    return {
        "voltage": round(voltage, 2),
        "current": round(current, 2),
        "power": round(power, 2),
        "energy": round(energy, 5)
    }


def generate_historical_data(headers):
    total_readings = HISTORICAL_DAYS * READINGS_PER_DAY

    print(f"\nGenerating {total_readings} historical readings...")
    print(f"Time period: Last {HISTORICAL_DAYS} days")
    print("Frequency: One reading per hour\n")

    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_time = now - timedelta(days=HISTORICAL_DAYS)

    successful = 0
    failed = 0

    for i in range(total_readings):

        recorded_at = start_time + timedelta(hours=i)

        reading = generate_reading()

        reading["recordedAt"] = recorded_at.isoformat(timespec="seconds")

        try:
            response = requests.post(
                f"{API_BASE_URL}/energy/readings",
                json=reading,
                headers=headers,
                timeout=15
            )

            response.raise_for_status()
            successful += 1

            print(
                f"[{successful}/{total_readings}] "
                f"Saved: {recorded_at} | "
                f"Power: {reading['power']} W"
            )

        except requests.RequestException as error:
            failed += 1
            print(f"Failed to save reading {i + 1}: {error}")

            if getattr(error, "response", None) is not None:
                print("Server response:", error.response.text)

        time.sleep(0.05)

    print("\n--- Historical Data Generation Complete ---")
    print("Successful readings:", successful)
    print("Failed readings:", failed)


if __name__ == "__main__":
    try:
        headers = login()
        generate_historical_data(headers)

    except requests.RequestException as error:
        print("\nCould not connect or log in to Synergy.")
        print("Check whether your backend is running.")
        print("Details:", error)

    except Exception as error:
        print("\nError:", error)
