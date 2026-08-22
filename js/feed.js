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
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


// =========================
// ELEMENTS
// =========================

const logoutBtn = document.getElementById("logoutBtn");
const feedPostsContainer = document.getElementById("feedPostsContainer");
const emptyFeedMessage = document.getElementById("emptyFeedMessage");


// =========================
// GLOBAL VARIABLES
// =========================

let currentUser = null;
let currentUserProfile = null;


// =========================
// CHECK LOGIN
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    try {
        await loadCurrentUserProfile();
        await loadFeedPosts();
    } catch (error) {
        console.error("Feed initialization error:", error);

        showFeedMessage(
            "Could not load the feed. Please try again."
        );
    }
});


// =========================
// LOAD CURRENT USER PROFILE
// =========================

async function loadCurrentUserProfile() {

    const userRef = doc(
        db,
        "users",
        currentUser.uid
    );

    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {

        currentUserProfile = userSnapshot.data();

    } else {

        currentUserProfile = {
            name: currentUser.displayName || "SocialApp User",
            username: "username",
            profilePicture: ""
        };
    }
}


// =========================
// LOAD FEED POSTS
// =========================

async function loadFeedPosts() {

    feedPostsContainer.innerHTML = `
        <p class="no-posts">
            Loading posts...
        </p>
    `;

    if (emptyFeedMessage) {
        emptyFeedMessage.hidden = true;
    }

    try {

        const postsQuery = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc")
        );

        const postsSnapshot = await getDocs(postsQuery);

        if (postsSnapshot.empty) {

            feedPostsContainer.innerHTML = "";

            if (emptyFeedMessage) {
                emptyFeedMessage.hidden = false;
            } else {
                feedPostsContainer.innerHTML = `
                    <p class="no-posts">
                        No posts yet.
                    </p>
                `;
            }

            return;
        }

        feedPostsContainer.innerHTML = "";

        for (const postDocument of postsSnapshot.docs) {

            const post = postDocument.data();
            const postId = postDocument.id;

            const likeInformation =
                await getLikeInformation(postId);

            const comments =
                await loadPostComments(postId);

            const postElement =
                createPostElement(
                    post,
                    postId,
                    likeInformation,
                    comments
                );

            feedPostsContainer.appendChild(
                postElement
            );
        }

    } catch (error) {

        console.error("Feed error:", error);

        showFeedMessage(
            getFriendlyError(error)
        );
    }
}


// =========================
// CREATE POST ELEMENT
// =========================

function createPostElement(
    post,
    postId,
    likeInformation,
    comments
) {

    const postElement =
        document.createElement("article");

    postElement.className = "feed-post";


    // =========================
    // AUTHOR INFORMATION
    // =========================

    const authorName =
        post.authorName || "SocialApp User";

    const authorUsername =
        post.authorUsername || "username";

    const authorId =
        post.userId || post.authorId || "";


    // =========================
    // PROFILE PICTURE
    // =========================

    let profilePictureHTML = `
        <div class="feed-profile-initial">
            ${escapeHtml(getFirstLetter(authorName))}
        </div>
    `;

    if (post.authorProfilePicture) {

        profilePictureHTML = `
            <img
                src="${escapeAttribute(post.authorProfilePicture)}"
                alt="${escapeAttribute(authorName)} profile picture"
                class="feed-profile-image"
                loading="lazy"
            >
        `;
    }


    // =========================
    // AUTHOR LINK
    // =========================

    let authorProfileHTML = "";

    if (authorId) {

        authorProfileHTML = `
            <a
                href="user.html?id=${encodeURIComponent(authorId)}"
                class="feed-author-profile"
            >
                ${profilePictureHTML}
            </a>
        `;

    } else {

        authorProfileHTML = profilePictureHTML;
    }


    // =========================
    // COMMENTS
    // =========================

    let commentsHTML = `
        <p class="no-comments">
            No comments yet.
        </p>
    `;

    if (comments.length > 0) {

        commentsHTML = "";

        comments.forEach((comment) => {

            const canDeleteComment =
                comment.userId === currentUser.uid ||
                post.userId === currentUser.uid;


            let deleteButtonHTML = "";

            if (canDeleteComment) {

                deleteButtonHTML = `
                    <button
                        type="button"
                        class="delete-comment-button"
                        data-comment-id="${escapeAttribute(comment.id)}"
                    >
                        Delete
                    </button>
                `;
            }


            commentsHTML += `
                <div
                    class="comment"
                    data-comment-id="${escapeAttribute(comment.id)}"
                >

                    <div class="comment-text">

                        <strong>
                            @${escapeHtml(
                                comment.authorUsername || "username"
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(comment.text || "")}
                        </span>

                    </div>

                    ${deleteButtonHTML}

                </div>
            `;
        });
    }


    // =========================
    // LIKE BUTTON
    // =========================

    const likedClass =
        likeInformation.currentUserLiked
            ? "liked"
            : "";

    const likeButtonText =
        likeInformation.currentUserLiked
            ? "♥ Liked"
            : "♡ Like";


    // =========================
    // POST IMAGE
    // =========================

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


    // =========================
    // AUTHOR NAME LINK
    // =========================

    let authorNameHTML = `
        <h3>
            ${escapeHtml(authorName)}
        </h3>

        <p>
            @${escapeHtml(authorUsername)}
        </p>
    `;

    if (authorId) {

        authorNameHTML = `
            <a
                href="user.html?id=${encodeURIComponent(authorId)}"
                class="feed-author-name"
            >

                <h3>
                    ${escapeHtml(authorName)}
                </h3>

                <p>
                    @${escapeHtml(authorUsername)}
                </p>

            </a>
        `;
    }


    // =========================
    // POST HTML
    // =========================

    postElement.innerHTML = `

        <div class="feed-post-author">

            ${authorProfileHTML}

            <div class="feed-author-information">

                ${authorNameHTML}

            </div>

        </div>


        ${imageHTML}


        <div class="feed-post-content">

            ${
                post.title
                    ? `
                        <h2>
                            ${escapeHtml(post.title)}
                        </h2>
                    `
                    : ""
            }


            ${
                post.description
                    ? `
                        <p class="feed-description">
                            ${escapeHtml(post.description)}
                        </p>
                    `
                    : ""
            }


            ${
                post.caption
                    ? `
                        <p class="feed-caption">
                            ${escapeHtml(post.caption)}
                        </p>
                    `
                    : ""
            }


            <p class="post-date">
                ${formatDate(post.createdAt)}
            </p>


            <div class="post-actions">

                <button
                    type="button"
                    class="like-button ${likedClass}"
                    data-post-id="${escapeAttribute(postId)}"
                >
                    ${likeButtonText}
                    (${likeInformation.likesCount})
                </button>

            </div>


            <div
                class="comments-section"
                data-post-owner-id="${escapeAttribute(
                    post.userId || ""
                )}"
            >

                <h4 data-count="${comments.length}">
                    Comments (${comments.length})
                </h4>


                <div class="comments-list">

                    ${commentsHTML}

                </div>


                <form
                    class="comment-form"
                    data-post-id="${escapeAttribute(postId)}"
                >

                    <input
                        type="text"
                        name="commentText"
                        placeholder="Write a comment..."
                        maxlength="300"
                        autocomplete="off"
                        required
                    >

                    <button type="submit">
                        Comment
                    </button>

                </form>

            </div>

        </div>
    `;


    return postElement;
}


// =========================
// LOAD POST COMMENTS
// =========================

async function loadPostComments(postId) {

    const commentsQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
    );

    const commentsSnapshot =
        await getDocs(commentsQuery);

    const comments = [];

    commentsSnapshot.forEach(
        (commentDocument) => {

            comments.push({
                id: commentDocument.id,
                ...commentDocument.data()
            });
        }
    );


    // Newest comments first

    comments.sort(
        (a, b) => {

            const timeA =
                a.createdAt?.toMillis?.() || 0;

            const timeB =
                b.createdAt?.toMillis?.() || 0;

            return timeB - timeA;
        }
    );


    return comments;
}


// =========================
// GET LIKE INFORMATION
// =========================

async function getLikeInformation(postId) {

    const likeId =
        `${postId}_${currentUser.uid}`;

    const userLikeRef =
        doc(
            db,
            "likes",
            likeId
        );

    const userLikeSnapshot =
        await getDoc(userLikeRef);


    const likesQuery = query(
        collection(db, "likes"),
        where(
            "postId",
            "==",
            postId
        )
    );


    const likesSnapshot =
        await getDocs(likesQuery);


    return {

        likesCount:
            likesSnapshot.size,

        currentUserLiked:
            userLikeSnapshot.exists()
    };
}


// =========================
// HANDLE LIKE BUTTON
// =========================

feedPostsContainer.addEventListener(
    "click",
    async (event) => {

        // -------------------------
        // DELETE COMMENT
        // -------------------------

        const deleteCommentButton =
            event.target.closest(
                ".delete-comment-button"
            );

        if (deleteCommentButton) {

            await deleteComment(
                deleteCommentButton
            );

            return;
        }


        // -------------------------
        // LIKE BUTTON
        // -------------------------

        const likeButton =
            event.target.closest(
                ".like-button"
            );

        if (!likeButton) {
            return;
        }


        const postId =
            likeButton.dataset.postId;


        if (!postId || !currentUser) {
            return;
        }


        const likeId =
            `${postId}_${currentUser.uid}`;


        const likeRef =
            doc(
                db,
                "likes",
                likeId
            );


        try {

            likeButton.disabled = true;


            const likeSnapshot =
                await getDoc(likeRef);


            if (likeSnapshot.exists()) {

                await deleteDoc(
                    likeRef
                );

            } else {

                await setDoc(
                    likeRef,
                    {
                        postId: postId,
                        userId: currentUser.uid,
                        createdAt: serverTimestamp()
                    }
                );
            }


            const likeInformation =
                await getLikeInformation(
                    postId
                );


            likeButton.textContent =
                `${
                    likeInformation.currentUserLiked
                        ? "♥ Liked"
                        : "♡ Like"
                } (${likeInformation.likesCount})`;


            likeButton.classList.toggle(
                "liked",
                likeInformation.currentUserLiked
            );


        } catch (error) {

            console.error(
                "Like error:",
                error
            );

            alert(
                getFriendlyError(error)
            );

        } finally {

            likeButton.disabled = false;
        }
    }
);


// =========================
// CREATE COMMENT
// =========================

feedPostsContainer.addEventListener(
    "submit",
    async (event) => {

        const commentForm =
            event.target.closest(
                ".comment-form"
            );


        if (!commentForm) {
            return;
        }


        event.preventDefault();


        const commentInput =
            commentForm.elements.commentText;


        const commentText =
            commentInput.value.trim();


        if (!commentText) {
            return;
        }


        const submitButton =
            commentForm.querySelector(
                "button[type='submit']"
            );


        try {

            submitButton.disabled = true;

            submitButton.textContent =
                "Sending...";


            const commentReference =
                await addDoc(
                    collection(db, "comments"),
                    {

                        postId:
                            commentForm.dataset.postId,

                        userId:
                            currentUser.uid,

                        authorName:
                            currentUserProfile?.name ||
                            currentUser.displayName ||
                            "SocialApp User",

                        authorUsername:
                            currentUserProfile?.username ||
                            "username",

                        text:
                            commentText,

                        createdAt:
                            serverTimestamp()
                    }
                );


            commentInput.value = "";


            const commentsSection =
                commentForm.closest(
                    ".comments-section"
                );


            const commentsList =
                commentsSection.querySelector(
                    ".comments-list"
                );


            const noComments =
                commentsList.querySelector(
                    ".no-comments"
                );


            if (noComments) {
                noComments.remove();
            }


            const newComment =
                document.createElement("div");


            newComment.className =
                "comment";


            newComment.dataset.commentId =
                commentReference.id;


            newComment.innerHTML = `

                <div class="comment-text">

                    <strong>
                        @${escapeHtml(
                            currentUserProfile?.username ||
                            "username"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(commentText)}
                    </span>

                </div>


                <button
                    type="button"
                    class="delete-comment-button"
                    data-comment-id="${escapeAttribute(
                        commentReference.id
                    )}"
                >
                    Delete
                </button>
            `;


            commentsList.prepend(
                newComment
            );


            updateCommentCount(
                commentsSection,
                1
            );


        } catch (error) {

            console.error(
                "Comment error:",
                error
            );

            alert(
                getFriendlyError(error)
            );

        } finally {

            submitButton.disabled = false;

            submitButton.textContent =
                "Comment";
        }
    }
);


// =========================
// DELETE COMMENT
// =========================

async function deleteComment(
    deleteButton
) {

    const commentId =
        deleteButton.dataset.commentId;


    if (!commentId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Are you sure you want to delete this comment?"
        );


    if (!confirmed) {
        return;
    }


    try {

        deleteButton.disabled = true;

        deleteButton.textContent =
            "Deleting...";


        await deleteDoc(
            doc(
                db,
                "comments",
                commentId
            )
        );


        const commentElement =
            deleteButton.closest(
                ".comment"
            );


        const commentsSection =
            deleteButton.closest(
                ".comments-section"
            );


        if (commentElement) {
            commentElement.remove();
        }


        updateCommentCount(
            commentsSection,
            -1
        );


        const commentsList =
            commentsSection.querySelector(
                ".comments-list"
            );


        if (
            commentsList &&
            commentsList.children.length === 0
        ) {

            commentsList.innerHTML = `
                <p class="no-comments">
                    No comments yet.
                </p>
            `;
        }


    } catch (error) {

        console.error(
            "Delete comment error:",
            error
        );


        alert(
            getFriendlyError(error)
        );


        deleteButton.disabled = false;

        deleteButton.textContent =
            "Delete";
    }
}


// =========================
// UPDATE COMMENT COUNT
// =========================

function updateCommentCount(
    commentsSection,
    change
) {

    if (!commentsSection) {
        return;
    }


    const heading =
        commentsSection.querySelector(
            "h4"
        );


    if (!heading) {
        return;
    }


    const oldCount =
        Number(
            heading.dataset.count || 0
        );


    const newCount =
        Math.max(
            0,
            oldCount + change
        );


    heading.dataset.count =
        String(newCount);


    heading.textContent =
        `Comments (${newCount})`;
}


// =========================
// SHOW FEED MESSAGE
// =========================

function showFeedMessage(
    message
) {

    feedPostsContainer.innerHTML = `
        <p class="no-posts">
            ${escapeHtml(message)}
        </p>
    `;

    if (emptyFeedMessage) {
        emptyFeedMessage.hidden = true;
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
// ESCAPE HTML ATTRIBUTE
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
            return "Firebase needs an additional configuration. Check your Firestore settings or indexes.";

        case "network-request-failed":
            return "Please check your internet connection.";

        default:
            return error.message ||
                "Something went wrong. Please try again.";
    }
}


// =========================
// LOGOUT
// =========================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            try {

                logoutBtn.disabled = true;

                logoutBtn.textContent =
                    "Logging out...";


                await signOut(auth);


                window.location.href =
                    "login.html";


            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                alert(
                    getFriendlyError(error)
                );


                logoutBtn.disabled = false;

                logoutBtn.textContent =
                    "Logout";
            }
        }
    );
}