import { auth, db } from "./config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// =========================
// ELEMENTS
// =========================

const userProfilePicture =
    document.getElementById("userProfilePicture");

const userProfileInitial =
    document.getElementById("userProfileInitial");

const userProfileImage =
    document.getElementById("userProfileImage");

const userDisplayName =
    document.getElementById("userDisplayName");

const userUsername =
    document.getElementById("userUsername");

const userBio =
    document.getElementById("userBio");

const userPostCount =
    document.getElementById("userPostCount");

const userFollowerCount =
    document.getElementById("userFollowerCount");

const userFollowingCount =
    document.getElementById("userFollowingCount");

const followBtn =
    document.getElementById("followBtn");

const userPostsContainer =
    document.getElementById("userPostsContainer");


// =========================
// GLOBAL VARIABLES
// =========================

let currentUser = null;
let viewedUserId = null;
let viewedUserProfile = null;


// =========================
// GET USER ID FROM URL
// =========================

function getUserIdFromURL() {

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    return urlParams.get("id");
}


// =========================
// CHECK LOGIN
// =========================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        currentUser = user;

        viewedUserId =
            getUserIdFromURL();

        if (!viewedUserId) {

            showPageError(
                "User profile not found."
            );

            return;
        }

        try {

            await loadUserProfile();

            await loadUserPosts();

            await loadFollowCounts();

            await setupFollowButton();

        } catch (error) {

            console.error(
                "User profile error:",
                error
            );

            showPageError(
                getFriendlyError(error)
            );
        }
    }
);


// =========================
// LOAD USER PROFILE
// =========================

async function loadUserProfile() {

    const userRef =
        doc(
            db,
            "users",
            viewedUserId
        );

    const userSnapshot =
        await getDoc(userRef);

    if (!userSnapshot.exists()) {

        showPageError(
            "This user does not exist."
        );

        return;
    }

    viewedUserProfile =
        userSnapshot.data();


    // NAME

    const name =
        viewedUserProfile.name ||
        "SocialApp User";

    userDisplayName.textContent =
        name;


    // USERNAME

    const username =
        viewedUserProfile.username ||
        "username";

    userUsername.textContent =
        `@${username}`;


    // BIO

    const bio =
        viewedUserProfile.bio ||
        "No bio available.";

    userBio.textContent =
        bio;


    // PROFILE PICTURE

    const profilePicture =
        viewedUserProfile.profilePicture ||
        viewedUserProfile.profilePictureURL ||
        "";

    if (profilePicture) {

        userProfileImage.src =
            profilePicture;

        userProfileImage.alt =
            `${name} profile picture`;

        userProfileImage.hidden =
            false;

        userProfileInitial.hidden =
            true;

    } else {

        userProfileImage.src = "";

        userProfileImage.hidden =
            true;

        userProfileInitial.hidden =
            false;

        userProfileInitial.textContent =
            getFirstLetter(name);
    }
}


// =========================
// LOAD USER POSTS
// =========================

async function loadUserPosts() {

    userPostsContainer.innerHTML = `
        <div class="no-posts">
            Loading posts...
        </div>
    `;

    try {

        const postsQuery =
            query(
                collection(db, "posts"),
                where(
                    "userId",
                    "==",
                    viewedUserId
                )
            );

        const postsSnapshot =
            await getDocs(postsQuery);

        if (postsSnapshot.empty) {

            userPostsContainer.innerHTML = `
                <div class="no-posts">
                    No posts yet.
                </div>
            `;

            userPostCount.textContent = "0";

            return;
        }

        const posts = [];

        postsSnapshot.forEach(
            (postDocument) => {

                posts.push({
                    id: postDocument.id,
                    ...postDocument.data()
                });
            }
        );


        // NEWEST FIRST

        posts.sort(
            (a, b) => {

                const timeA =
                    a.createdAt?.toMillis?.() || 0;

                const timeB =
                    b.createdAt?.toMillis?.() || 0;

                return timeB - timeA;
            }
        );


        userPostCount.textContent =
            String(posts.length);

        userPostsContainer.innerHTML = "";


        for (const post of posts) {

            const postElement =
                createUserPostElement(post);

            userPostsContainer.appendChild(
                postElement
            );
        }

    } catch (error) {

        console.error(
            "User posts error:",
            error
        );

        userPostsContainer.innerHTML = `
            <div class="no-posts">
                ${escapeHtml(
                    getFriendlyError(error)
                )}
            </div>
        `;
    }
}


// =========================
// CREATE USER POST
// =========================

function createUserPostElement(post) {

    const postElement =
        document.createElement("article");

    postElement.className =
        "feed-post";


    // AUTHOR

    const authorName =
        post.authorName ||
        viewedUserProfile?.name ||
        "SocialApp User";

    const authorUsername =
        post.authorUsername ||
        viewedUserProfile?.username ||
        "username";


    // PROFILE PICTURE

    let profilePictureHTML = `
        <div class="feed-profile-initial">
            ${escapeHtml(
                getFirstLetter(authorName)
            )}
        </div>
    `;


    const profilePicture =
        post.authorProfilePicture ||
        viewedUserProfile?.profilePicture ||
        viewedUserProfile?.profilePictureURL ||
        "";


    if (profilePicture) {

        profilePictureHTML = `
            <img
                src="${escapeAttribute(profilePicture)}"
                alt="${escapeAttribute(authorName)} profile picture"
                class="feed-profile-image"
                loading="lazy"
            >
        `;
    }


    // POST IMAGE

    let imageHTML = "";

    if (post.imageURL) {

        imageHTML = `
            <img
                src="${escapeAttribute(post.imageURL)}"
                alt="${escapeAttribute(
                    post.title || "SocialApp post"
                )}"
                class="feed-post-image"
                loading="lazy"
            >
        `;
    }


    // TITLE

    let titleHTML = "";

    if (post.title) {

        titleHTML = `
            <h2>
                ${escapeHtml(post.title)}
            </h2>
        `;
    }


    // DESCRIPTION

    let descriptionHTML = "";

    if (post.description) {

        descriptionHTML = `
            <p class="feed-description">
                ${escapeHtml(post.description)}
            </p>
        `;
    }


    // CAPTION

    let captionHTML = "";

    if (post.caption) {

        captionHTML = `
            <p class="feed-caption">
                ${escapeHtml(post.caption)}
            </p>
        `;
    }


    // POST HTML

    postElement.innerHTML = `

        <div class="feed-post-author">

            <div class="feed-author-profile">
                ${profilePictureHTML}
            </div>

            <div class="feed-author-information">

                <h3>
                    ${escapeHtml(authorName)}
                </h3>

                <p>
                    @${escapeHtml(authorUsername)}
                </p>

            </div>

        </div>


        ${imageHTML}


        <div class="feed-post-content">

            ${titleHTML}

            ${descriptionHTML}

            ${captionHTML}

            <p class="post-date">
                ${formatDate(post.createdAt)}
            </p>

        </div>
    `;

    return postElement;
}


// =====================================================
// FOLLOW SYSTEM
// =====================================================


// =========================
// LOAD FOLLOW COUNTS
// =========================

async function loadFollowCounts() {

    try {

        // =========================
        // FOLLOWERS
        // =========================

        const followersQuery =
            query(
                collection(db, "followers"),
                where(
                    "followingId",
                    "==",
                    viewedUserId
                )
            );

        const followersSnapshot =
            await getDocs(
                followersQuery
            );

        userFollowerCount.textContent =
            String(
                followersSnapshot.size
            );


        // =========================
        // FOLLOWING
        // =========================

        const followingQuery =
            query(
                collection(db, "followers"),
                where(
                    "followerId",
                    "==",
                    viewedUserId
                )
            );

        const followingSnapshot =
            await getDocs(
                followingQuery
            );

        userFollowingCount.textContent =
            String(
                followingSnapshot.size
            );

    } catch (error) {

        console.error(
            "Follow count error:",
            error
        );

        userFollowerCount.textContent =
            "0";

        userFollowingCount.textContent =
            "0";
    }
}


// =========================
// SETUP FOLLOW BUTTON
// =========================

async function setupFollowButton() {

    if (!followBtn) {
        return;
    }


    // =========================
    // OWN PROFILE
    // =========================

    if (
        currentUser.uid ===
        viewedUserId
    ) {

        followBtn.style.display =
            "none";

        return;
    }


    followBtn.style.display =
        "inline-block";


    await checkFollowStatus();


    // IMPORTANT:
    // Remove any previous listener
    // before adding one.

    followBtn.onclick =
        handleFollowButton;
}


// =========================
// CHECK FOLLOW STATUS
// =========================

async function checkFollowStatus() {

    try {

        const followId =
            `${currentUser.uid}_${viewedUserId}`;


        const followRef =
            doc(
                db,
                "followers",
                followId
            );


        const followSnapshot =
            await getDoc(
                followRef
            );


        if (followSnapshot.exists()) {

            setFollowingButton();

        } else {

            setFollowButton();
        }

    } catch (error) {

        console.error(
            "Follow status error:",
            error
        );
    }
}


// =========================
// FOLLOW BUTTON UI
// =========================

function setFollowButton() {

    followBtn.textContent =
        "Follow";

    followBtn.classList.remove(
        "following"
    );
}


// =========================
// FOLLOWING BUTTON UI
// =========================

function setFollowingButton() {

    followBtn.textContent =
        "Following";

    followBtn.classList.add(
        "following"
    );
}


// =========================
// HANDLE FOLLOW BUTTON
// =========================

async function handleFollowButton() {

    if (
        !currentUser ||
        !viewedUserId
    ) {
        return;
    }


    if (
        currentUser.uid ===
        viewedUserId
    ) {
        return;
    }


    try {

        followBtn.disabled =
            true;


        const followId =
            `${currentUser.uid}_${viewedUserId}`;


        const followRef =
            doc(
                db,
                "followers",
                followId
            );


        const followSnapshot =
            await getDoc(
                followRef
            );


        // =========================
        // UNFOLLOW
        // =========================

        if (followSnapshot.exists()) {

            await deleteDoc(
                followRef
            );

            setFollowButton();


            const oldCount =
                Number(
                    userFollowerCount.textContent
                ) || 0;


            userFollowerCount.textContent =
                String(
                    Math.max(
                        0,
                        oldCount - 1
                    )
                );


        // =========================
        // FOLLOW
        // =========================

        } else {

            await setDoc(
                followRef,
                {
                    followerId:
                        currentUser.uid,

                    followingId:
                        viewedUserId,

                    createdAt:
                        serverTimestamp()
                }
            );


            setFollowingButton();


            const oldCount =
                Number(
                    userFollowerCount.textContent
                ) || 0;


            userFollowerCount.textContent =
                String(
                    oldCount + 1
                );
        }


    } catch (error) {

        console.error(
            "Follow error:",
            error
        );

        alert(
            getFriendlyError(error)
        );

    } finally {

        followBtn.disabled =
            false;
    }
}


// =========================
// SHOW PAGE ERROR
// =========================

function showPageError(message) {

    if (userPostsContainer) {

        userPostsContainer.innerHTML = `
            <div class="no-posts">
                ${escapeHtml(message)}
            </div>
        `;
    }
}


// =========================
// GET FIRST LETTER
// =========================

function getFirstLetter(name) {

    if (!name) {
        return "U";
    }

    const cleanName =
        String(name).trim();

    if (!cleanName) {
        return "U";
    }

    return cleanName
        .charAt(0)
        .toUpperCase();
}


// =========================
// FORMAT DATE
// =========================

function formatDate(timestamp) {

    if (!timestamp) {
        return "Just now";
    }

    try {

        const date =
            timestamp.toDate();

        return date.toLocaleDateString(
            "en-US",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return "Just now";
    }
}


// =========================
// ESCAPE HTML
// =========================

function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    const div =
        document.createElement("div");

    div.textContent =
        String(text);

    return div.innerHTML;
}


// =========================
// ESCAPE ATTRIBUTE
// =========================

function escapeAttribute(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// =========================
// FRIENDLY FIREBASE ERRORS
// =========================

function getFriendlyError(error) {

    if (!error) {
        return "Something went wrong.";
    }

    switch (error.code) {

        case "permission-denied":

            return "You do not have permission to perform this action.";

        case "unavailable":

            return "Firebase is temporarily unavailable. Please try again.";

        case "failed-precondition":

            return "Firebase needs additional configuration. Check your Firestore settings or indexes.";

        case "network-request-failed":

            return "Please check your internet connection.";

        default:

            return (
                error.message ||
                "Something went wrong. Please try again."
            );
    }
}