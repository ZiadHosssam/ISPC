function handleCredentialResponse(credentialRes) {
    //decodeJwtResponse always found in googleAuthenticator
    const decodedCredentialJson = decodeJwtResponse(credentialRes.credential);
    console.log(decodedCredentialJson);
    const img = document.getElementById("google_img");
    console.log(decodedCredentialJson.picture);
    img.src = decodedCredentialJson.picture;
}
