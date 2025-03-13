function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

//handleCredentialResponse is always used from another js file
window.onload = () => {
    google.accounts.id.initialize({client_id: '681080828876-sste11p6qkbelvi47grdi5tu3c4o6n9o.apps.googleusercontent.com', callback: handleCredentialResponse});
    google.accounts.id.prompt();
};