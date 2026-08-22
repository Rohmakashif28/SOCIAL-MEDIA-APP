import { auth } from "./config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


// =========================
// ELEMENTS
// =========================

const loginForm =
    document.getElementById("loginForm");

const loginBtn =
    document.getElementById("loginBtn");

const loginMessage =
    document.getElementById("loginMessage");

const loginEmail =
    document.getElementById("loginEmail");

const loginPassword =
    document.getElementById("loginPassword");


// =========================
// LOGIN FORM
// =========================

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // =========================
        // GET VALUES
        // =========================

        const email =
            loginEmail.value
                .trim()
                .toLowerCase();

        const password =
            loginPassword.value;


        // =========================
        // CLEAR OLD MESSAGE
        // =========================

        hideMessage();


        // =========================
        // VALIDATION
        // =========================

        if (!email) {

            showMessage(
                "Please enter your email address."
            );

            loginEmail.focus();

            return;
        }


        if (!isValidEmail(email)) {

            showMessage(
                "Please enter a valid email address."
            );

            loginEmail.focus();

            return;
        }


        if (!password) {

            showMessage(
                "Please enter your password."
            );

            loginPassword.focus();

            return;
        }


        // =========================
        // LOGIN
        // =========================

        try {

            setLoadingState(true);


            showMessage(
                "Logging you in...",
                "info"
            );


            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            console.log(
                "Login successful:",
                user.uid
            );


            // =========================
            // SUCCESS
            // =========================

            showMessage(
                "Login successful! Redirecting...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "feed.html";

                },
                500
            );


        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            showMessage(
                getLoginErrorMessage(error)
            );


            setLoadingState(false);
        }
    }
);


// =========================
// EMAIL VALIDATION
// =========================

function isValidEmail(email) {

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    return emailPattern.test(
        email
    );
}


// =========================
// LOADING STATE
// =========================

function setLoadingState(
    isLoading
) {

    if (!loginBtn) {
        return;
    }


    loginBtn.disabled =
        isLoading;


    if (isLoading) {

        loginBtn.textContent =
            "Logging in...";

    } else {

        loginBtn.textContent =
            "Login";
    }
}


// =========================
// SHOW MESSAGE
// =========================

function showMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {

        alert(message);

        return;
    }


    loginMessage.textContent =
        message;


    loginMessage.className =
        `form-message ${type}`;


    loginMessage.hidden =
        false;
}


// =========================
// HIDE MESSAGE
// =========================

function hideMessage() {

    if (!loginMessage) {
        return;
    }


    loginMessage.textContent =
        "";


    loginMessage.className =
        "form-message";


    loginMessage.hidden =
        true;
}


// =========================
// FIREBASE ERROR MESSAGES
// =========================

function getLoginErrorMessage(
    error
) {

    switch (error.code) {

        case "auth/invalid-credential":

            return "Incorrect email or password. Please check your details and try again.";


        case "auth/invalid-email":

            return "Please enter a valid email address.";


        case "auth/user-disabled":

            return "This account has been disabled. Please contact support.";


        case "auth/too-many-requests":

            return "Too many unsuccessful login attempts. Please wait a while and try again.";


        case "auth/network-request-failed":

            return "Network error. Please check your internet connection and try again.";


        case "auth/user-not-found":

            return "No account was found with this email address.";


        case "auth/wrong-password":

            return "Incorrect password. Please try again.";


        case "auth/operation-not-allowed":

            return "Email and password login is not enabled in Firebase Authentication.";


        default:

            return error.message ||
                "Login failed. Please try again.";
    }
}