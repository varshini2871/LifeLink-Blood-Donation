// ======================================================
// LIFELINK - MAIN JAVASCRIPT
// ======================================================


// ======================================================
// FIREBASE IMPORTS
// ======================================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// Firebase objects created in index.html
const auth = window.firebaseAuth;
const db = window.firebaseDB;


// ======================================================
// HELPER FUNCTION
// ======================================================

function $(id) {
    return document.getElementById(id);
}


// ======================================================
// TOAST MESSAGE
// ======================================================

function showToast(message) {

    const toast = $("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// ======================================================
// SECURITY - ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ======================================================
// FIREBASE LOGIN / REGISTER
// ======================================================

let registerMode = false;


// Switch between Login and Register
if ($("switchAuth")) {

    $("switchAuth").addEventListener("click", () => {

        registerMode = !registerMode;

        $("authMessage").textContent = "";

        if (registerMode) {

            $("authTitle").textContent = "Create Account";

            $("authSubtitle").textContent =
                "Register to use LifeLink";

            $("usernameBox").classList.remove("hidden");

            $("authButton").textContent = "Register";

            $("switchText").textContent =
                "Already have an account?";

            $("switchAuth").textContent = "Login";

        } else {

            $("authTitle").textContent = "Login";

            $("authSubtitle").textContent =
                "Login to access LifeLink";

            $("usernameBox").classList.add("hidden");

            $("authButton").textContent = "Login";

            $("switchText").textContent =
                "Don't have an account?";

            $("switchAuth").textContent = "Register";
        }

    });

}


// ======================================================
// LOGIN / REGISTER BUTTON
// ======================================================

if ($("authButton")) {

    $("authButton").addEventListener("click", async () => {

        const email =
            $("authEmail").value.trim();

        const password =
            $("authPassword").value;

        const username =
            $("username").value.trim();


        // Clear old message
        $("authMessage").textContent = "";


        // -------------------------------
        // BASIC VALIDATION
        // -------------------------------

        if (!email || !password) {

            $("authMessage").textContent =
                "Email and password are required.";

            return;
        }


        if (registerMode && !username) {

            $("authMessage").textContent =
                "Username is required.";

            return;
        }


        if (password.length < 6) {

            $("authMessage").textContent =
                "Password must contain at least 6 characters.";

            return;
        }


        try {

            // ==================================================
            // REGISTER
            // ==================================================

            if (registerMode) {

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // Save user information in Firestore
                await setDoc(
                    doc(db, "users", user.uid),
                    {
                        username: username,
                        email: email,
                        createdAt:
                            new Date().toISOString()
                    }
                );


                $("authMessage").textContent =
                    "Registration successful!";


                showToast(
                    "Account created successfully."
                );


            }

            // ==================================================
            // LOGIN
            // ==================================================

            else {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            }


        } catch (error) {

            console.error(
                "Authentication error:",
                error
            );


            // Firebase error messages

            if (
                error.code ===
                "auth/email-already-in-use"
            ) {

                $("authMessage").textContent =
                    "This email is already registered.";

            }

            else if (
                error.code ===
                "auth/invalid-credential"
            ) {

                $("authMessage").textContent =
                    "Incorrect email or password.";

            }

            else if (
                error.code ===
                "auth/invalid-email"
            ) {

                $("authMessage").textContent =
                    "Please enter a valid email address.";

            }

            else if (
                error.code ===
                "auth/weak-password"
            ) {

                $("authMessage").textContent =
                    "Password must contain at least 6 characters.";

            }

            else {

                $("authMessage").textContent =
                    error.message;
            }

        }

    });

}


// ======================================================
// CHECK LOGIN STATUS
// ======================================================

onAuthStateChanged(auth, async (user) => {

    if (user) {

        // USER IS LOGGED IN

        if ($("authPage")) {
            $("authPage").style.display = "none";
        }

        const header =
            document.querySelector("header");

        if (header) {
            header.style.display = "flex";
        }

        const main =
            document.querySelector("main");

        if (main) {
            main.style.display = "block";
        }

        loadDashboard();

    } else {

        // USER IS NOT LOGGED IN

        if ($("authPage")) {
            $("authPage").style.display = "flex";
        }

        const header =
            document.querySelector("header");

        if (header) {
            header.style.display = "none";
        }

        const main =
            document.querySelector("main");

        if (main) {
            main.style.display = "none";
        }


        // CLEAR LOGIN FORM

        if ($("authEmail")) {
            $("authEmail").value = "";
        }

        if ($("authPassword")) {
            $("authPassword").value = "";
        }

        if ($("username")) {
            $("username").value = "";
        }

    }

});


// ======================================================
// BACKEND API
// ======================================================

const API = "/api";


async function apiRequest(
    url,
    options = {}
) {

    try {

        const response =
            await fetch(API + url, {

                headers: {
                    "Content-Type":
                        "application/json"
                },

                ...options

            });


        // Try to read JSON
        const result =
            await response.json();


        if (!response.ok) {

            const error =
                new Error(
                    result.message ||
                    "Something went wrong."
                );

            error.details =
                result.errors || [];

            throw error;
        }


        return result;


    } catch (error) {

        if (
            error instanceof TypeError
        ) {

            throw new Error(
                "Cannot connect to server. Start Node.js using npm start."
            );

        }

        throw error;
    }

}


// ======================================================
// PAGE NAVIGATION
// ======================================================

const pages =
    document.querySelectorAll(".page");

const nav =
    $("nav");


// Navigation buttons
document
    .querySelectorAll("[data-page]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const pageName =
                    button.dataset.page;


                // Hide all pages
                pages.forEach(page => {

                    page.classList.remove(
                        "active"
                    );

                });


                // Show selected page
                const selectedPage =
                    $(pageName);

                if (selectedPage) {

                    selectedPage.classList.add(
                        "active"
                    );
                }


                if (nav) {
                    nav.classList.remove(
                        "open"
                    );
                }


                // Load required data

                if (
                    pageName === "dashboard"
                ) {

                    loadDashboard();

                }


                if (
                    pageName === "donors"
                ) {

                    loadDonors();

                }


                if (
                    pageName === "requests"
                ) {

                    loadRequests();

                }


                window.scrollTo(
                    0,
                    0
                );

            }
        );

    });


// ======================================================
// LIFELINK LOGO -> HOME
// ======================================================

if ($("homeLogo")) {

    $("homeLogo").addEventListener(
        "click",
        () => {

            pages.forEach(page => {

                page.classList.remove(
                    "active"
                );

            });


            if ($("dashboard")) {

                $("dashboard")
                    .classList.add("active");

            }


            if (nav) {

                nav.classList.remove(
                    "open"
                );

            }


            loadDashboard();


            window.scrollTo(
                0,
                0
            );

        }
    );

}


// ======================================================
// MOBILE MENU
// ======================================================

if ($("menuBtn")) {

    $("menuBtn").addEventListener(
        "click",
        () => {

            if (nav) {

                nav.classList.toggle(
                    "open"
                );

            }

        }
    );

}


// ======================================================
// DASHBOARD
// ======================================================

async function loadDashboard() {

    try {

        const donors =
            await apiRequest(
                "/donors"
            );

        const requests =
            await apiRequest(
                "/requests"
            );


        if ($("totalDonors")) {

            $("totalDonors")
                .textContent =
                donors.count;

        }


        const available =
            donors.data.filter(
                donor =>
                    donor.availability ===
                    "Available"
            ).length;


        const active =
            requests.data.filter(
                request =>
                    request.status ===
                    "Active"
            ).length;


        if ($("availableDonors")) {

            $("availableDonors")
                .textContent =
                available;

        }


        if ($("activeRequests")) {

            $("activeRequests")
                .textContent =
                active;

        }


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// ======================================================
// REGISTER DONOR
// ======================================================

if ($("donorForm")) {

    $("donorForm").addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const phone =
                $("phone").value.trim();


            // Phone validation
            if (
                !/^[0-9]{10}$/.test(phone)
            ) {

                $("donorMessage")
                    .textContent =
                    "Phone number must contain exactly 10 digits.";

                return;
            }


            const donor = {

                name:
                    $("name")
                        .value
                        .trim(),

                bloodGroup:
                    $("bloodGroup")
                        .value,

                phone:
                    phone,

                email:
                    $("email")
                        .value
                        .trim(),

                location:
                    $("location")
                        .value
                        .trim(),

                availability:
                    $("availability")
                        .value,

                lastDonationDate:
                    $("lastDonationDate")
                        .value,

                notes:
                    $("notes")
                        .value
                        .trim()

            };


            try {

                const result =
                    await apiRequest(
                        "/donors",
                        {

                            method: "POST",

                            body:
                                JSON.stringify(
                                    donor
                                )

                        }
                    );


                $("donorMessage")
                    .textContent =
                    result.message;


                this.reset();


                showToast(
                    "Donor registered successfully."
                );


                loadDashboard();


            } catch (error) {

                $("donorMessage")
                    .textContent =
                    error.message;

            }

        }
    );

}


// ======================================================
// LOAD DONORS
// ======================================================

async function loadDonors() {

    try {

        const search =
            encodeURIComponent(
                $("search")
                    .value
                    .trim()
            );


        const blood =
            encodeURIComponent(
                $("bloodFilter")
                    .value
            );


        const availability =
            encodeURIComponent(
                $("availabilityFilter")
                    .value
            );


        const result =
            await apiRequest(
                `/donors?search=${search}&bloodGroup=${blood}&availability=${availability}`
            );


        const container =
            $("donorList");


        container.innerHTML = "";


        if (
            result.data.length === 0
        ) {

            container.innerHTML =
                "<p>No matching donors found.</p>";

            return;
        }


        result.data.forEach(
            donor => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "card";


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(donor.name)}
                    </h3>

                    <p class="blood">
                        ${escapeHTML(donor.bloodGroup)}
                    </p>

                    <p>
                        📍 ${escapeHTML(donor.location)}
                    </p>

                    <p>
                        📞 ${escapeHTML(donor.phone)}
                    </p>

                    <p class="${
                        donor.availability ===
                        "Available"
                        ? "available"
                        : "unavailable"
                    }">

                        ${escapeHTML(
                            donor.availability
                        )}

                    </p>

                    <button
                        class="primary"
                        onclick="deleteDonor('${donor.id}')"
                    >
                        Delete
                    </button>

                `;


                container.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// Search donors
if ($("searchBtn")) {

    $("searchBtn").addEventListener(
        "click",
        loadDonors
    );

}


// ======================================================
// DELETE DONOR
// ======================================================

async function deleteDonor(id) {

    const answer =
        confirm(
            "Delete this donor?"
        );


    if (!answer) {
        return;
    }


    try {

        const result =
            await apiRequest(
                `/donors/${id}`,
                {
                    method: "DELETE"
                }
            );


        showToast(
            result.message
        );


        loadDonors();

        loadDashboard();


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// ======================================================
// CREATE EMERGENCY REQUEST
// ======================================================

if ($("requestForm")) {

    $("requestForm").addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const phone =
                $("contactPhone")
                    .value
                    .trim();


            // Phone validation
            if (
                !/^[0-9]{10}$/.test(phone)
            ) {

                $("requestMessage")
                    .textContent =
                    "Phone number must contain exactly 10 digits.";

                return;
            }


            const quantity =
                Number(
                    $("quantity")
                        .value
                );


            if (
                !quantity ||
                quantity <= 0
            ) {

                $("requestMessage")
                    .textContent =
                    "Please enter a valid blood quantity.";

                return;
            }


            const request = {

                patientName:
                    $("patientName")
                        .value
                        .trim(),

                hospital:
                    $("hospital")
                        .value
                        .trim(),

                bloodGroup:
                    $("requestBloodGroup")
                        .value,

                quantity:
                    quantity,

                location:
                    $("requestLocation")
                        .value
                        .trim(),

                requiredDate:
                    $("requiredDate")
                        .value,

                requiredTime:
                    $("requiredTime")
                        .value,

                description:
                    $("description")
                        .value
                        .trim(),

                contactName:
                    $("contactName")
                        .value
                        .trim(),

                contactPhone:
                    phone

            };


            try {

                const result =
                    await apiRequest(
                        "/requests",
                        {

                            method: "POST",

                            body:
                                JSON.stringify(
                                    request
                                )

                        }
                    );


                $("requestMessage")
                    .textContent =
                    result.message;


                this.reset();


                showToast(
                    "Emergency request created."
                );


                loadDashboard();


            } catch (error) {

                $("requestMessage")
                    .textContent =
                    error.message;

            }

        }
    );

}


// ======================================================
// LOAD EMERGENCY REQUESTS
// ======================================================

async function loadRequests() {

    try {

        const blood =
            encodeURIComponent(
                $("requestBloodFilter")
                    .value
            );


        const status =
            encodeURIComponent(
                $("requestStatusFilter")
                    .value
            );


        const result =
            await apiRequest(
                `/requests?bloodGroup=${blood}&status=${status}`
            );


        const container =
            $("requestList");


        container.innerHTML = "";


        if (
            result.data.length === 0
        ) {

            container.innerHTML =
                "<p>No emergency requests found.</p>";

            return;
        }


        result.data.forEach(
            request => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "request-card";


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(
                            request.patientName
                        )}
                    </h3>

                    <p>
                        Hospital:
                        ${escapeHTML(
                            request.hospital
                        )}
                    </p>

                    <p class="blood">
                        ${escapeHTML(
                            request.bloodGroup
                        )}
                    </p>

                    <p>
                        Quantity:
                        ${request.quantity}
                    </p>

                    <p>
                        Location:
                        ${escapeHTML(
                            request.location
                        )}
                    </p>

                    <p>
                        Required:
                        ${escapeHTML(
                            request.requiredDate
                        )}

                        at

                        ${escapeHTML(
                            request.requiredTime
                        )}
                    </p>

                    <p>
                        Contact:
                        ${escapeHTML(
                            request.contactName
                        )}
                        -
                        ${escapeHTML(
                            request.contactPhone
                        )}
                    </p>

                    <p class="status">
                        ${escapeHTML(
                            request.status
                        )}
                    </p>


                    ${
                        request.status ===
                        "Active"

                        ? `

                            <button
                                class="primary"
                                onclick="updateRequestStatus(
                                    '${request.id}',
                                    'Fulfilled'
                                )"
                            >
                                Mark Fulfilled
                            </button>


                            <button
                                class="secondary"
                                onclick="updateRequestStatus(
                                    '${request.id}',
                                    'Cancelled'
                                )"
                            >
                                Cancel
                            </button>

                        `

                        : ""
                    }


                    <button
                        class="secondary"
                        onclick="deleteRequest(
                            '${request.id}'
                        )"
                    >
                        Delete
                    </button>

                `;


                container.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// Search/filter requests
if ($("requestSearchBtn")) {

    $("requestSearchBtn")
        .addEventListener(
            "click",
            loadRequests
        );

}


// ======================================================
// UPDATE REQUEST STATUS
// ======================================================

async function updateRequestStatus(
    id,
    status
) {

    try {

        const result =
            await apiRequest(
                `/requests/${id}`,
                {

                    method: "PUT",

                    body:
                        JSON.stringify({
                            status: status
                        })

                }
            );


        showToast(
            result.message
        );


        loadRequests();

        loadDashboard();


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// ======================================================
// DELETE REQUEST
// ======================================================

async function deleteRequest(id) {

    if (
        !confirm(
            "Delete this emergency request?"
        )
    ) {

        return;
    }


    try {

        const result =
            await apiRequest(
                `/requests/${id}`,
                {
                    method: "DELETE"
                }
            );


        showToast(
            result.message
        );


        loadRequests();

        loadDashboard();


    } catch (error) {

        showToast(
            error.message
        );

    }

}


// ======================================================
// LOGOUT
// ======================================================

if ($("logoutBtn")) {

    $("logoutBtn").addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

// Refresh the page and show the login screen
window.location.reload();

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );


                showToast(
                    "Unable to logout."
                );

            }

        }
    );

}


// ======================================================
// MAKE FUNCTIONS AVAILABLE TO HTML BUTTONS
// ======================================================

// Because script.js is a module,
// inline onclick buttons cannot automatically
// find these functions.

window.deleteDonor =
    deleteDonor;

window.updateRequestStatus =
    updateRequestStatus;

window.deleteRequest =
    deleteRequest;


// ======================================================
// END OF SCRIPT
// ======================================================