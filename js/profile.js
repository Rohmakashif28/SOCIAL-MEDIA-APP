import { auth, db } from "./config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// =====================================================
// CLOUDINARY SETTINGS
// =====================================================

const CLOUDINARY_CLOUD_NAME = "vxtrsjjb";

const CLOUDINARY_UPLOAD_PRESET = "social_media_upload";

const CLOUDINARY_UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


// =====================================================
// CONSTANTS
// =====================================================

const MAX_PROFILE_IMAGE_SIZE =
    5 * 1024 * 1024;

const MAX_POST_IMAGE_SIZE =
    10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];


// =====================================================
// PROFILE ELEMENTS
// =====================================================

const profileName =
    document.getElementById("profileName");

const profileUsername =
    document.getElementById("profileUsername");

const profileBio =
    document.getElementById("profileBio");

const profileInitial =
    document.getElementById("profileInitial");

const profileImage =
    document.getElementById("profileImage");

const profileImageInput =
    document.getElementById("profileImageInput");

const uploadProfileImageBtn =
    document.getElementById("uploadProfileImageBtn");

const profileImageMessage =
    document.getElementById("profileImageMessage");

const followersCount =
    document.getElementById("followersCount");

const followingCount =
    document.getElementById("followingCount");

const postsCount =
    document.getElementById("postsCount");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================================
// EDIT PROFILE ELEMENTS
// =====================================================

const editProfileBtn =
    document.getElementById("editProfileBtn");

const editProfileForm =
    document.getElementById("editProfileForm");

const editName =
    document.getElementById("editName");

const editUsername =
    document.getElementById("editUsername");

const editBio =
    document.getElementById("editBio");

const saveProfileBtn =
    document.getElementById("saveProfileBtn");

const cancelEditBtn =
    document.getElementById("cancelEditBtn");

const profileEditMessage =
    document.getElementById("profileEditMessage");


// =====================================================
// CREATE POST ELEMENTS
// =====================================================

const createPostForm =
    document.getElementById("createPostForm");

const postTitle =
    document.getElementById("postTitle");

const postDescription =
    document.getElementById("postDescription");

const postCaption =
    document.getElementById("postCaption");

const postImageInput =
    document.getElementById("postImageInput");

const createPostBtn =
    document.getElementById("createPostBtn");

const postMessage =
    document.getElementById("postMessage");

const userPostsContainer =
    document.getElementById("userPostsContainer");


// =====================================================
// APPLICATION STATE
// =====================================================

let currentUser = null;

let currentUserProfile = null;

let selectedProfileImageFile = null;


// =====================================================
// AUTHENTICATION
// =====================================================

onAuthStateChanged(
    auth,
    async function (user) {

        if (!user) {

            window.location.href =
                "login.html";

            return;
        }

        currentUser = user;

        await loadProfile();
    }
);


// =====================================================
// LOAD PROFILE
// =====================================================

async function loadProfile() {

    try {

        showProfileLoading();


        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const userSnapshot =
            await getDoc(userRef);


        if (!userSnapshot.exists()) {

            showProfileMessage(
                "Your user profile could not be found.",
                "error"
            );

            return;
        }


        currentUserProfile =
            userSnapshot.data();


        displayProfile(
            currentUserProfile
        );


        await loadUserPosts();

    } catch (error) {

        console.error(
            "Profile loading error:",
            error
        );

        showProfileMessage(
            "Could not load your profile. Please try again.",
            "error"
        );
    }
}


// =====================================================
// DISPLAY PROFILE
// =====================================================

function displayProfile(userData) {

    const name =
        userData.name || "SocialApp User";

    const username =
        userData.username || "username";

    const bio =
        userData.bio || "No bio yet.";


    profileName.textContent =
        name;

    profileUsername.textContent =
        `@${username}`;

    profileBio.textContent =
        bio;


    followersCount.textContent =
        Number(userData.followersCount || 0);

    followingCount.textContent =
        Number(userData.followingCount || 0);


    profileInitial.textContent =
        getFirstLetter(name);


    if (userData.profilePicture) {

        profileImage.src =
            userData.profilePicture;

        profileImage.alt =
            `${name}'s profile picture`;

        profileImage.hidden =
            false;

        profileInitial.hidden =
            true;

    } else {

        profileImage.removeAttribute("src");

        profileImage.hidden =
            true;

        profileInitial.hidden =
            false;
    }


    editName.value =
        userData.name || "";

    editUsername.value =
        userData.username || "";

    editBio.value =
        userData.bio || "";
}


// =====================================================
// PROFILE IMAGE SELECTION
// =====================================================

profileImageInput.addEventListener(
    "change",
    function () {

        const file =
            profileImageInput.files[0];


        if (!file) {

            selectedProfileImageFile =
                null;

            return;
        }


        if (
            !ALLOWED_IMAGE_TYPES.includes(
                file.type
            )
        ) {

            showProfileImageMessage(
                "Please choose a JPG, PNG, or WebP image.",
                "error"
            );

            profileImageInput.value =
                "";

            selectedProfileImageFile =
                null;

            return;
        }


        if (
            file.size >
            MAX_PROFILE_IMAGE_SIZE
        ) {

            showProfileImageMessage(
                "Profile picture must be smaller than 5 MB.",
                "error"
            );

            profileImageInput.value =
                "";

            selectedProfileImageFile =
                null;

            return;
        }


        selectedProfileImageFile =
            file;


        const previewURL =
            URL.createObjectURL(file);


        profileImage.src =
            previewURL;

        profileImage.alt =
            "New profile picture preview";

        profileImage.hidden =
            false;

        profileInitial.hidden =
            true;


        showProfileImageMessage(
            "Image selected. Click Save Profile Picture to upload it.",
            "success"
        );
    }
);


// =====================================================
// SAVE PROFILE IMAGE
// =====================================================

uploadProfileImageBtn.addEventListener(
    "click",
    async function () {

        if (!currentUser) {

            showProfileImageMessage(
                "You must be logged in.",
                "error"
            );

            return;
        }


        if (!selectedProfileImageFile) {

            showProfileImageMessage(
                "Please choose a profile picture first.",
                "error"
            );

            return;
        }


        try {

            uploadProfileImageBtn.disabled =
                true;

            uploadProfileImageBtn.textContent =
                "Uploading...";


            showProfileImageMessage(
                "Uploading your profile picture...",
                "info"
            );


            const imageURL =
                await uploadImageToCloudinary(
                    selectedProfileImageFile
                );


            const userRef =
                doc(
                    db,
                    "users",
                    currentUser.uid
                );


            await updateDoc(
                userRef,
                {
                    profilePicture:
                        imageURL
                }
            );


            currentUserProfile.profilePicture =
                imageURL;


            profileImage.src =
                imageURL;

            profileImage.alt =
                `${currentUserProfile.name || "User"}'s profile picture`;

            profileImage.hidden =
                false;

            profileInitial.hidden =
                true;


            selectedProfileImageFile =
                null;

            profileImageInput.value =
                "";


            showProfileImageMessage(
                "Profile picture saved successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Profile image upload error:",
                error
            );

            showProfileImageMessage(
                getFriendlyErrorMessage(
                    error,
                    "Could not save your profile picture."
                ),
                "error"
            );

        } finally {

            uploadProfileImageBtn.disabled =
                false;

            uploadProfileImageBtn.textContent =
                "Save Profile Picture";
        }
    }
);


// =====================================================
// OPEN EDIT PROFILE
// =====================================================

editProfileBtn.addEventListener(
    "click",
    function () {

        editProfileForm.hidden =
            false;

        editProfileBtn.hidden =
            true;

        clearMessage(
            profileEditMessage
        );


        editName.focus();
    }
);


// =====================================================
// CANCEL PROFILE EDIT
// =====================================================

cancelEditBtn.addEventListener(
    "click",
    function () {

        editProfileForm.hidden =
            true;

        editProfileBtn.hidden =
            false;


        if (currentUserProfile) {

            editName.value =
                currentUserProfile.name || "";

            editUsername.value =
                currentUserProfile.username || "";

            editBio.value =
                currentUserProfile.bio || "";
        }


        clearMessage(
            profileEditMessage
        );
    }
);


// =====================================================
// SAVE PROFILE DETAILS
// =====================================================

saveProfileBtn.addEventListener(
    "click",
    async function () {

        if (!currentUser) {

            showProfileEditMessage(
                "You must be logged in.",
                "error"
            );

            return;
        }


        const newName =
            editName.value.trim();

        const newUsername =
            editUsername.value
                .trim()
                .toLowerCase();

        const newBio =
            editBio.value.trim();


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!newName) {

            showProfileEditMessage(
                "Please enter your name.",
                "error"
            );

            editName.focus();

            return;
        }


        if (!newUsername) {

            showProfileEditMessage(
                "Please enter a username.",
                "error"
            );

            editUsername.focus();

            return;
        }


        if (
            !/^[a-z0-9._]+$/.test(
                newUsername
            )
        ) {

            showProfileEditMessage(
                "Username can only contain lowercase letters, numbers, dots, and underscores.",
                "error"
            );

            editUsername.focus();

            return;
        }


        if (
            newUsername.length < 3
        ) {

            showProfileEditMessage(
                "Username must contain at least 3 characters.",
                "error"
            );

            editUsername.focus();

            return;
        }


        if (
            newUsername.length > 30
        ) {

            showProfileEditMessage(
                "Username cannot be longer than 30 characters.",
                "error"
            );

            editUsername.focus();

            return;
        }


        try {

            saveProfileBtn.disabled =
                true;

            saveProfileBtn.textContent =
                "Saving...";


            showProfileEditMessage(
                "Saving your profile...",
                "info"
            );


            // -----------------------------------------
            // CHECK USERNAME
            // -----------------------------------------

            const usernameQuery =
                query(
                    collection(db, "users"),
                    where(
                        "username",
                        "==",
                        newUsername
                    )
                );


            const usernameSnapshot =
                await getDocs(
                    usernameQuery
                );


            const usernameTaken =
                usernameSnapshot.docs.some(
                    function (userDocument) {

                        return (
                            userDocument.id !==
                            currentUser.uid
                        );
                    }
                );


            if (usernameTaken) {

                showProfileEditMessage(
                    "That username is already taken.",
                    "error"
                );

                return;
            }


            // -----------------------------------------
            // UPDATE FIRESTORE
            // -----------------------------------------

            const userRef =
                doc(
                    db,
                    "users",
                    currentUser.uid
                );


            await updateDoc(
                userRef,
                {
                    name:
                        newName,

                    username:
                        newUsername,

                    bio:
                        newBio
                }
            );


            // -----------------------------------------
            // UPDATE LOCAL DATA
            // -----------------------------------------

            currentUserProfile.name =
                newName;

            currentUserProfile.username =
                newUsername;

            currentUserProfile.bio =
                newBio;


            displayProfile(
                currentUserProfile
            );


            editProfileForm.hidden =
                true;

            editProfileBtn.hidden =
                false;


            showProfileMessage(
                "Profile updated successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            showProfileEditMessage(
                getFriendlyErrorMessage(
                    error,
                    "Could not update your profile."
                ),
                "error"
            );

        } finally {

            saveProfileBtn.disabled =
                false;

            saveProfileBtn.textContent =
                "Save Changes";
        }
    }
);


// =====================================================
// CREATE POST
// =====================================================

createPostForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!currentUser) {

            showPostMessage(
                "You must be logged in to create a post.",
                "error"
            );

            return;
        }


        const title =
            postTitle.value.trim();

        const description =
            postDescription.value.trim();

        const caption =
            postCaption.value.trim();

        const imageFile =
            postImageInput.files[0];


        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!title) {

            showPostMessage(
                "Please enter a post title.",
                "error"
            );

            postTitle.focus();

            return;
        }


        if (!imageFile) {

            showPostMessage(
                "Please select an image for your post.",
                "error"
            );

            return;
        }


        if (
            !ALLOWED_IMAGE_TYPES.includes(
                imageFile.type
            )
        ) {

            showPostMessage(
                "Please choose a JPG, PNG, or WebP image.",
                "error"
            );

            return;
        }


        if (
            imageFile.size >
            MAX_POST_IMAGE_SIZE
        ) {

            showPostMessage(
                "Post image must be smaller than 10 MB.",
                "error"
            );

            return;
        }


        try {

            createPostBtn.disabled =
                true;

            createPostBtn.textContent =
                "Uploading...";


            showPostMessage(
                "Uploading your post image...",
                "info"
            );


            // -----------------------------------------
            // CLOUDINARY UPLOAD
            // -----------------------------------------

            const imageURL =
                await uploadImageToCloudinary(
                    imageFile
                );


            createPostBtn.textContent =
                "Creating Post...";


            // -----------------------------------------
            // FIRESTORE POST
            // -----------------------------------------

            await addDoc(
                collection(db, "posts"),
                {
                    userId:
                        currentUser.uid,

                    authorName:
                        currentUserProfile.name || "SocialApp User",

                    authorUsername:
                        currentUserProfile.username || "username",

                    authorProfilePicture:
                        currentUserProfile.profilePicture || "",

                    title:
                        title,

                    description:
                        description,

                    caption:
                        caption,

                    imageURL:
                        imageURL,

                    createdAt:
                        serverTimestamp()
                }
            );


            // -----------------------------------------
            // RESET
            // -----------------------------------------

            createPostForm.reset();


            showPostMessage(
                "Post created successfully.",
                "success"
            );


            await loadUserPosts();

        } catch (error) {

            console.error(
                "Create post error:",
                error
            );

            showPostMessage(
                getFriendlyErrorMessage(
                    error,
                    "Could not create your post."
                ),
                "error"
            );

        } finally {

            createPostBtn.disabled =
                false;

            createPostBtn.textContent =
                "Create Post";
        }
    }
);


// =====================================================
// LOAD USER POSTS
// =====================================================

async function loadUserPosts() {

    if (!currentUser) {
        return;
    }


    try {

        userPostsContainer.innerHTML = `
            <p class="no-posts">
                Loading your posts...
            </p>
        `;


        const postsQuery =
            query(
                collection(db, "posts"),
                where(
                    "userId",
                    "==",
                    currentUser.uid
                )
            );


        const postsSnapshot =
            await getDocs(
                postsQuery
            );


        postsCount.textContent =
            postsSnapshot.size;


        if (postsSnapshot.empty) {

            userPostsContainer.innerHTML = `
                <p class="no-posts">
                    You haven't created any posts yet.
                </p>
            `;

            return;
        }


        const posts = [];


        postsSnapshot.forEach(
            function (postDocument) {

                posts.push({
                    id:
                        postDocument.id,

                    ...postDocument.data()
                });
            }
        );


        // ---------------------------------------------
        // NEWEST FIRST
        // ---------------------------------------------

        posts.sort(
            function (a, b) {

                const timeA =
                    a.createdAt?.toMillis?.() || 0;

                const timeB =
                    b.createdAt?.toMillis?.() || 0;

                return timeB - timeA;
            }
        );


        userPostsContainer.innerHTML =
            "";


        posts.forEach(
            function (post) {

                renderUserPost(
                    post
                );
            }
        );

    } catch (error) {

        console.error(
            "Load posts error:",
            error
        );


        userPostsContainer.innerHTML = `
            <p class="no-posts">
                Could not load your posts.
            </p>
        `;
    }
}


// =====================================================
// RENDER USER POST
// =====================================================

function renderUserPost(post) {

    const postElement =
        document.createElement(
            "article"
        );


    postElement.className =
        "user-post";


    const image =
        document.createElement(
            "img"
        );

    image.className =
        "post-image";

    image.src =
        post.imageURL || "";

    image.alt =
        post.title
            ? post.title
            : "My SocialApp post";

    image.loading =
        "lazy";


    const content =
        document.createElement(
            "div"
        );

    content.className =
        "post-content";


    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        post.title || "";


    const description =
        document.createElement(
            "p"
        );

    description.textContent =
        post.description || "";


    const caption =
        document.createElement(
            "p"
        );

    caption.className =
        "post-caption";

    caption.textContent =
        post.caption || "";


    const date =
        document.createElement(
            "small"
        );

    date.className =
        "post-date";

    date.textContent =
        formatDate(
            post.createdAt
        );


    // ---------------------------------------------
    // EDIT BUTTON
    // ---------------------------------------------

    const editButton =
        document.createElement(
            "button"
        );

    editButton.type =
        "button";

    editButton.className =
        "edit-post-button";

    editButton.textContent =
        "Edit";

    editButton.dataset.postId =
        post.id;


    // ---------------------------------------------
    // DELETE BUTTON
    // ---------------------------------------------

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-post-button";

    deleteButton.textContent =
        "Delete";

    deleteButton.dataset.postId =
        post.id;


    // ---------------------------------------------
    // ACTIONS
    // ---------------------------------------------

    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "post-management-actions";


    actions.appendChild(
        editButton
    );

    actions.appendChild(
        deleteButton
    );


    // ---------------------------------------------
    // CONTENT
    // ---------------------------------------------

    content.appendChild(
        title
    );

    content.appendChild(
        description
    );

    content.appendChild(
        caption
    );

    content.appendChild(
        date
    );

    content.appendChild(
        actions
    );


    postElement.appendChild(
        image
    );

    postElement.appendChild(
        content
    );


    userPostsContainer.appendChild(
        postElement
    );
}


// =====================================================
// USER POST ACTIONS
// =====================================================

userPostsContainer.addEventListener(
    "click",
    async function (event) {

        const editButton =
            event.target.closest(
                ".edit-post-button"
            );


        if (editButton) {

            await editPost(
                editButton.dataset.postId
            );

            return;
        }


        const deleteButton =
            event.target.closest(
                ".delete-post-button"
            );


        if (deleteButton) {

            await deletePost(
                deleteButton.dataset.postId
            );
        }
    }
);


// =====================================================
// EDIT POST
// =====================================================

async function editPost(postId) {

    try {

        const postRef =
            doc(
                db,
                "posts",
                postId
            );


        const postSnapshot =
            await getDoc(
                postRef
            );


        if (!postSnapshot.exists()) {

            showPostMessage(
                "This post no longer exists.",
                "error"
            );

            return;
        }


        const post =
            postSnapshot.data();


        // ---------------------------------------------
        // OWNERSHIP CHECK
        // ---------------------------------------------

        if (
            post.userId !==
            currentUser.uid
        ) {

            showPostMessage(
                "You can only edit your own posts.",
                "error"
            );

            return;
        }


        const newTitle =
            prompt(
                "Edit post title:",
                post.title || ""
            );


        if (newTitle === null) {
            return;
        }


        const newDescription =
            prompt(
                "Edit post description:",
                post.description || ""
            );


        if (newDescription === null) {
            return;
        }


        const newCaption =
            prompt(
                "Edit post caption:",
                post.caption || ""
            );


        if (newCaption === null) {
            return;
        }


        const cleanTitle =
            newTitle.trim();

        const cleanDescription =
            newDescription.trim();

        const cleanCaption =
            newCaption.trim();


        if (!cleanTitle) {

            showPostMessage(
                "Post title cannot be empty.",
                "error"
            );

            return;
        }


        if (cleanTitle.length > 100) {

            showPostMessage(
                "Post title cannot exceed 100 characters.",
                "error"
            );

            return;
        }


        if (
            cleanDescription.length >
            500
        ) {

            showPostMessage(
                "Description cannot exceed 500 characters.",
                "error"
            );

            return;
        }


        if (
            cleanCaption.length >
            300
        ) {

            showPostMessage(
                "Caption cannot exceed 300 characters.",
                "error"
            );

            return;
        }


        await updateDoc(
            postRef,
            {
                title:
                    cleanTitle,

                description:
                    cleanDescription,

                caption:
                    cleanCaption,

                updatedAt:
                    serverTimestamp()
            }
        );


        showPostMessage(
            "Post updated successfully.",
            "success"
        );


        await loadUserPosts();

    } catch (error) {

        console.error(
            "Edit post error:",
            error
        );


        showPostMessage(
            getFriendlyErrorMessage(
                error,
                "Could not edit the post."
            ),
            "error"
        );
    }
}


// =====================================================
// DELETE POST
// =====================================================

async function deletePost(postId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this post?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const postRef =
            doc(
                db,
                "posts",
                postId
            );


        const postSnapshot =
            await getDoc(
                postRef
            );


        if (!postSnapshot.exists()) {

            showPostMessage(
                "This post no longer exists.",
                "error"
            );

            return;
        }


        const post =
            postSnapshot.data();


        // ---------------------------------------------
        // OWNERSHIP CHECK
        // ---------------------------------------------

        if (
            post.userId !==
            currentUser.uid
        ) {

            showPostMessage(
                "You can only delete your own posts.",
                "error"
            );

            return;
        }


        await deleteDoc(
            postRef
        );


        showPostMessage(
            "Post deleted successfully.",
            "success"
        );


        await loadUserPosts();

    } catch (error) {

        console.error(
            "Delete post error:",
            error
        );


        showPostMessage(
            getFriendlyErrorMessage(
                error,
                "Could not delete the post."
            ),
            "error"
        );
    }
}


// =====================================================
// CLOUDINARY UPLOAD
// =====================================================

async function uploadImageToCloudinary(
    file
) {

    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    formData.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );


    const response =
        await fetch(
            CLOUDINARY_UPLOAD_URL,
            {
                method: "POST",
                body: formData
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            "Cloudinary upload failed."
        );
    }


    if (!data.secure_url) {

        throw new Error(
            "Cloudinary did not return an image URL."
        );
    }


    return data.secure_url;
}


// =====================================================
// PROFILE LOADING STATE
// =====================================================

function showProfileLoading() {

    profileName.textContent =
        "Loading...";

    profileUsername.textContent =
        "@username";

    profileBio.textContent =
        "Loading profile...";

    followersCount.textContent =
        "0";

    followingCount.textContent =
        "0";

    postsCount.textContent =
        "0";
}


// =====================================================
// PROFILE IMAGE MESSAGE
// =====================================================

function showProfileImageMessage(
    message,
    type
) {

    if (!profileImageMessage) {
        return;
    }


    profileImageMessage.textContent =
        message;

    profileImageMessage.dataset.type =
        type;

    profileImageMessage.hidden =
        false;
}


// =====================================================
// PROFILE EDIT MESSAGE
// =====================================================

function showProfileEditMessage(
    message,
    type
) {

    if (!profileEditMessage) {
        return;
    }


    profileEditMessage.textContent =
        message;

    profileEditMessage.dataset.type =
        type;

    profileEditMessage.hidden =
        false;
}


// =====================================================
// GENERAL PROFILE MESSAGE
// =====================================================

function showProfileMessage(
    message,
    type
) {

    if (!profileEditMessage) {
        return;
    }


    profileEditMessage.textContent =
        message;

    profileEditMessage.dataset.type =
        type;

    profileEditMessage.hidden =
        false;
}


// =====================================================
// POST MESSAGE
// =====================================================

function showPostMessage(
    message,
    type
) {

    if (!postMessage) {
        return;
    }


    postMessage.textContent =
        message;

    postMessage.dataset.type =
        type;

    postMessage.hidden =
        false;
}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage(
    element
) {

    if (!element) {
        return;
    }


    element.textContent =
        "";

    element.hidden =
        true;

    element.removeAttribute(
        "data-type"
    );
}


// =====================================================
// FIRST LETTER
// =====================================================

function getFirstLetter(
    name
) {

    if (!name) {
        return "U";
    }


    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(
    timestamp
) {

    if (
        !timestamp ||
        !timestamp.toDate
    ) {

        return "Just now";
    }


    return timestamp
        .toDate()
        .toLocaleDateString(
            "en-US",
            {
                day:
                    "numeric",

                month:
                    "short",

                year:
                    "numeric"
            }
        );
}


// =====================================================
// FRIENDLY ERROR MESSAGE
// =====================================================

function getFriendlyErrorMessage(
    error,
    fallbackMessage
) {

    if (!error) {
        return fallbackMessage;
    }


    if (
        error.code ===
        "permission-denied"
    ) {

        return "You don't have permission to perform this action.";
    }


    if (
        error.code ===
        "unavailable"
    ) {

        return "The service is temporarily unavailable. Please try again.";
    }


    return error.message ||
        fallbackMessage;
}


// =====================================================
// LOGOUT
// =====================================================

logoutBtn.addEventListener(
    "click",
    async function () {

        try {

            logoutBtn.disabled =
                true;

            logoutBtn.textContent =
                "Logging out...";


            await signOut(
                auth
            );


            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );


            logoutBtn.disabled =
                false;

            logoutBtn.textContent =
                "Logout";


            alert(
                "Could not log out. Please try again."
            );
        }
    }
);