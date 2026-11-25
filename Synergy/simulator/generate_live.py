
import random
import time
from datetime import datetime
from getpass import getpass

import requests

from config import API_BASE_URL, LIVE_INTERVAL


def login():
    print("\n--- Synergy Live Data Simulator ---")

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
    voltage = random.uniform(220, 240)
    current = random.uniform(0.5, 4.5)

    # Occasionally simulate unusual electrical conditions
    if random.random() < 0.03:
        voltage = random.choice([
            random.uniform(195, 206),
            random.uniform(254, 260)
        ])

    if random.random() < 0.04:
        current = random.uniform(5.1, 7.0)

    power = voltage * current * random.uniform(0.90, 0.99)

    # Energy consumed during a 5-second interval (kWh)
    energy = (power / 1000) * (LIVE_INTERVAL / 3600)

    return {
        "voltage": round(voltage, 2),
        "current": round(current, 2),
        "power": round(power, 2),
        "energy": round(energy, 7),
        "recordedAt": datetime.now().isoformat(timespec="seconds")
    }


def start_simulation(headers):
    print("\nLive simulation started!")
    print(f"New reading every {LIVE_INTERVAL} seconds.")
    print("Press CTRL + C to stop.\n")

    count = 0

    while True:
        reading = generate_reading()

        try:
            response = requests.post(
                f"{API_BASE_URL}/energy/readings",
                json=reading,
                headers=headers,
                timeout=15
            )

            response.raise_for_status()
            count += 1

            print(
                f"[{count}] "
                f"Time: {reading['recordedAt']} | "
                f"Voltage: {reading['voltage']} V | "
                f"Current: {reading['current']} A | "
                f"Power: {reading['power']} W | "
                f"Energy: {reading['energy']} kWh | "
                f"Saved successfully"
            )

        except requests.RequestException as error:
            print("\nCould not save reading:", error)

            if getattr(error, "response", None) is not None:
                print("Server response:", error.response.text)

        time.sleep(LIVE_INTERVAL)


if __name__ == "__main__":
    try:
        headers = login()
        start_simulation(headers)

    except KeyboardInterrupt:
        print("\nLive simulation stopped.")

    except requests.RequestException as error:
        print("\nCould not connect or log in to Synergy.")
        print("Check whether your backend is running.")
        print("Details:", error)

    except Exception as error:
        print("\nError:", error)
