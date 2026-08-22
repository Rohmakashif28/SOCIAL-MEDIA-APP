import { auth, db } from "./config.js";

import {
    createUserWithEmailAndPassword,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// =========================
// ELEMENTS
// =========================

const signupForm =
    document.getElementById("signupForm");

const signupBtn =
    document.getElementById("signupBtn");

const signupMessage =
    document.getElementById("signupMessage");


// =========================
// SIGNUP FORM
// =========================

signupForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // =========================
        // GET FORM VALUES
        // =========================

        const name =
            document
                .getElementById("signupName")
                .value
                .trim();


        const username =
            document
                .getElementById("signupUsername")
                .value
                .trim()
                .toLowerCase()
                .replace(/^@/, "");


        const email =
            document
                .getElementById("signupEmail")
                .value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("signupPassword")
                .value;


        const confirmPassword =
            document
                .getElementById("signupConfirmPassword")
                .value;


        hideMessage();


        // =========================
        // VALIDATE NAME
        // =========================

        if (name.length < 2) {

            showMessage(
                "Please enter your full name."
            );

            return;
        }


        if (name.length > 50) {

            showMessage(
                "Your name must be 50 characters or less."
            );

            return;
        }


        // =========================
        // VALIDATE USERNAME
        // =========================

        if (!username) {

            showMessage(
                "Please enter a username."
            );

            return;
        }


        if (!isValidUsername(username)) {

            showMessage(
                "Username can only contain letters, numbers, and underscores."
            );

            return;
        }


        if (
            username.length < 3 ||
            username.length > 30
        ) {

            showMessage(
                "Username must be between 3 and 30 characters."
            );

            return;
        }


        // =========================
        // VALIDATE EMAIL
        // =========================

        if (!isValidEmail(email)) {

            showMessage(
                "Please enter a valid email address."
            );

            return;
        }


        // =========================
        // VALIDATE PASSWORD
        // =========================

        if (password.length < 6) {

            showMessage(
                "Password must be at least 6 characters long."
            );

            return;
        }


        if (password !== confirmPassword) {

            showMessage(
                "Passwords do not match."
            );

            return;
        }


        // =========================
        // CREATE ACCOUNT
        // =========================

        let createdUser = null;

        let accountCreated = false;


        try {

            setLoadingState(true);


            showMessage(
                "Creating your account...",
                "info"
            );


            // =========================
            // FIREBASE AUTHENTICATION
            // =========================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            createdUser =
                userCredential.user;

            accountCreated = true;


            console.log(
                "Firebase user created:",
                createdUser.uid
            );


            // =========================
            // FIRESTORE
            // =========================

            const userRef =
                doc(
                    db,
                    "users",
                    createdUser.uid
                );


            const usernameRef =
                doc(
                    db,
                    "usernames",
                    username
                );


            /*
             * Transaction makes the username
             * reservation and user profile
             * creation happen together.
             */

            await runTransaction(
                db,
                async function (transaction) {

                    // -------------------------
                    // CHECK USERNAME
                    // -------------------------

                    const usernameSnapshot =
                        await transaction.get(
                            usernameRef
                        );


                    if (usernameSnapshot.exists()) {

                        throw new Error(
                            "USERNAME_ALREADY_EXISTS"
                        );
                    }


                    // -------------------------
                    // USER PROFILE
                    // -------------------------

                    const userProfile = {

                        uid:
                            createdUser.uid,

                        name:
                            name,

                        username:
                            username,

                        email:
                            email,

                        profilePicture:
                            "",

                        bio:
                            "",

                        followersCount:
                            0,

                        followingCount:
                            0,

                        createdAt:
                            serverTimestamp()
                    };


                    // -------------------------
                    // CREATE USER
                    // -------------------------

                    transaction.set(
                        userRef,
                        userProfile
                    );


                    // -------------------------
                    // RESERVE USERNAME
                    // -------------------------

                    transaction.set(
                        usernameRef,
                        {
                            uid:
                                createdUser.uid,

                            username:
                                username,

                            createdAt:
                                serverTimestamp()
                        }
                    );
                }
            );


            console.log(
                "User profile created successfully."
            );


            console.log(
                "Username reserved successfully."
            );


            // =========================
            // SUCCESS
            // =========================

            showMessage(
                "Account created successfully! Redirecting...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "feed.html";

                },
                800
            );


        } catch (error) {

            console.error(
                "Signup error:",
                error
            );


            // =========================
            // USERNAME ALREADY EXISTS
            // =========================

            if (
                error.message ===
                "USERNAME_ALREADY_EXISTS"
            ) {

                /*
                 * The Firebase Authentication
                 * account was already created.
                 *
                 * Since the username is unavailable,
                 * remove the newly created account.
                 */

                if (
                    createdUser &&
                    accountCreated
                ) {

                    try {

                        await deleteUser(
                            createdUser
                        );

                    } catch (deleteError) {

                        console.error(
                            "Could not roll back account:",
                            deleteError
                        );
                    }
                }


                showMessage(
                    `@${username} is already taken. Please choose another username.`
                );


                setLoadingState(false);

                return;
            }


            // =========================
            // ROLLBACK IF FIRESTORE FAILED
            // =========================

            if (
                createdUser &&
                accountCreated
            ) {

                try {

                    await deleteUser(
                        createdUser
                    );

                    console.log(
                        "Firebase account rolled back."
                    );

                } catch (deleteError) {

                    console.error(
                        "Account rollback failed:",
                        deleteError
                    );
                }
            }


            // =========================
            // SHOW ERROR
            // =========================

            showMessage(
                getSignupErrorMessage(error)
            );


            setLoadingState(false);
        }
    }
);


// =========================
// USERNAME VALIDATION
// =========================

function isValidUsername(username) {

    /*
     * Allowed:
     *
     * a-z
     * 0-9
     * _
     *
     * Not allowed:
     *
     * spaces
     * @
     * hyphens
     * special characters
     */

    const usernamePattern =
        /^[a-z0-9_]+$/;


    return usernamePattern.test(
        username
    );
}


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

    if (!signupBtn) {
        return;
    }


    signupBtn.disabled =
        isLoading;


    if (isLoading) {

        signupBtn.textContent =
            "Creating Account...";

    } else {

        signupBtn.textContent =
            "Create Account";
    }
}


// =========================
// SHOW MESSAGE
// =========================

function showMessage(
    message,
    type = "error"
) {

    if (!signupMessage) {

        alert(message);

        return;
    }


    signupMessage.textContent =
        message;


    signupMessage.className =
        `form-message ${type}`;


    signupMessage.hidden =
        false;
}


// =========================
// HIDE MESSAGE
// =========================

function hideMessage() {

    if (!signupMessage) {
        return;
    }


    signupMessage.textContent =
        "";


    signupMessage.className =
        "form-message";


    signupMessage.hidden =
        true;
}


// =========================
// FIREBASE ERROR MESSAGES
// =========================

function getSignupErrorMessage(
    error
) {

    switch (error.code) {

        case "auth/email-already-in-use":

            return "This email is already registered. Please login instead.";


        case "auth/invalid-email":

            return "Please enter a valid email address.";


        case "auth/weak-password":

            return "Your password is too weak. Please choose a stronger password.";


        case "auth/network-request-failed":

            return "Network error. Please check your internet connection and try again.";


        case "auth/operation-not-allowed":

            return "Email and password sign-up is not enabled in Firebase Authentication.";


        case "permission-denied":

            return "You do not have permission to create your profile. Please check your Firestore rules.";


        case "failed-precondition":

            return "Firestore needs additional configuration. Please check your Firebase setup.";


        case "unavailable":

            return "Firebase is temporarily unavailable. Please try again.";


        default:

            return error.message ||
                "Could not create your account. Please try again.";
    }
}