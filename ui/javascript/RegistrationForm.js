const onSelectedState = (obj) => {
    fetch(`https://api.countrystatecity.in/v1/countries/US/states/${obj.value.slice(0, 2)}/cities`, {
        headers: {
            "X-CSCAPI-KEY": "MVZaRnRTVmxEUk00OXd6bWFNOWd5WFR4NUZsNTBpOW9wS2lQMGFINg=="
        }
    }).then((response) => {
        response.json().then((result) => {

            // Populate the city entries
            if (result.length !== 0) {
                // Append the city selection
                const locationSelection = document.getElementById('location-selection')

                const previousCitySelectionDiv = document.getElementById('city-selection-div')
                const citySelectionDiv = document.createElement('div')
                citySelectionDiv.id = "city-selection-div"

                const citySelectionLabel = document.createElement('label')
                citySelectionLabel.for = "city"
                citySelectionLabel.innerHTML = "Select your city:"

                const citySelection = document.createElement('select')
                citySelection.id = "city"
                citySelection.name = "city"
                citySelection.required = true
                citySelection.innerHTML = '<option id="default-city" value="">--Please choose a city--</option>';

                citySelectionDiv.appendChild(citySelectionLabel)
                citySelectionDiv.appendChild(document.createElement('br'))
                citySelectionDiv.appendChild(citySelection)


                if (previousCitySelectionDiv !== null) {
                    locationSelection.replaceChild(citySelectionDiv, previousCitySelectionDiv)
                } else {
                    locationSelection.appendChild(document.createElement('br'))
                    locationSelection.appendChild(citySelectionDiv)
                }

                result.forEach(city => {
                    const option = document.createElement('option');

                    option.value = city.name; // Value contains the state name and the iso value
                    option.textContent = city.name; // Display the state name

                    citySelection.appendChild(option);
                });
            }
        })
    })
}

// Function to fetch countries from the REST Countries API
async function fetchCountries() {
    const superStates = [
        "New England",
        "New York",
        "Jersey Penn",
        "Great Lakes",
        "Virginia Carolina",
        "Florida",
        "Mississippi",
        "North Central",
        "Texas",
        "South West",
        "Pacific Northwest",
        "California"
    ]

    const locationDropdown = document.getElementById('state');

    // Clear any existing options (except the default one)
    locationDropdown.innerHTML = '<option value="">--Please choose a state--</option>';

    // Add each state as an option
    superStates.forEach(state => {
        const option = document.createElement('option');

        option.value = state; // Value contains the state name and the iso value
        option.textContent = state;

        locationDropdown.appendChild(option);
    });
}

// --- Form submission handler ---
const responseMessage = (displayMessage, color) => {
    const previousMessage= document.getElementById("message")
    const message = document.createElement('p')
    message.id = "message"
    message.innerHTML = displayMessage
    message.style.cssText = `color: ${color}; text-align: center`
    if (previousMessage !== null) {
        document.getElementById("response-message").replaceChild(message, previousMessage)
    }
    document.getElementById("response-message").appendChild(message)
}
// Get the form object
window.onload = () => {
    // Fetch countries when the page loads
    fetchCountries()

    let form = document.getElementById('register-form');
    console.log(form)
    form.onsubmit = (event) => {
        event.preventDefault()
        let request = new XMLHttpRequest();
        let requestBody = Object.fromEntries(new FormData(form))
        // // Modify the location section in requestBody
        // requestBody.location = `${requestBody.state.slice(2)},${requestBody.city ? requestBody.city : ""}` // Using toSpice to omit the iso2 code
        // delete requestBody.city
        // delete requestBody.state

        //open the request
        console.log(requestBody)
        fetch('http://localhost:8080/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        }).then((response) => {
            response.json().then((result) => {
                // On failure
                if (typeof result.error !== "undefined") {
                    const error = typeof result.error === "string" ? result.error : Object.entries(result.error)[0][1];
                    responseMessage(error, "#f38ba8")
                }
                // On success
                else {
                    responseMessage(result.message, "#a6e3a1")
                    setTimeout(() => {
                        window.location.replace("./login.html");
                    }, 1000)
                }

            })
        }).catch((error) => {
            responseMessage(error, "#f38ba8")
        })
    }
}
