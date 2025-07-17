// --- Form submission handler ---
const responseMessage = (displayMessage, color) => {
    const previousMessage = document.getElementById("message")
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
    let form = document.getElementById('register-form');
    console.log(form)
    form.onsubmit = (event) => {
        event.preventDefault()
        let request = new XMLHttpRequest();
        let formData = new FormData(form);
        console.log(formData)
        //open the request
        fetch('http://localhost:8080/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(Object.fromEntries(formData))
        }).then((response) => {
            response.json().then((result) => {
                // On failure
                if (typeof result.error !== "undefined") {
                    responseMessage(result.message, "#f38ba8")
                }
                // On success
                else {
                    responseMessage(result.message, "#a6e3a1")
                }

            })
        }).catch((error) => {
            responseMessage(error, "#f38ba8")
        })
    }
}
