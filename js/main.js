// =========================
// SOCIALAPP MAIN JAVASCRIPT
// =========================


// =========================
// PAGE INITIALIZATION
// =========================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeNavigation();

        initializeHeroButtons();

        console.log(
            "SocialApp initialized successfully."
        );
    }
);


// =========================
// NAVIGATION
// =========================

function initializeNavigation() {

    const navigation =
        document.querySelector(".main-nav");


    if (!navigation) {
        return;
    }


    const currentPage =
        window.location.pathname
            .split("/")
            .pop();


    const navigationLinks =
        navigation.querySelectorAll("a");


    navigationLinks.forEach(
        function (link) {

            const linkPage =
                link
                    .getAttribute("href")
                    .split("/")
                    .pop();


            if (
                linkPage === currentPage
            ) {

                link.setAttribute(
                    "aria-current",
                    "page"
                );
            }
        }
    );
}


// =========================
// HERO BUTTONS
// =========================

function initializeHeroButtons() {

    const heroButtons =
        document.querySelectorAll(
            ".hero-buttons a"
        );


    if (!heroButtons.length) {
        return;
    }


    heroButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    button.classList.add(
                        "button-clicked"
                    );
                }
            );
        }
    );
}