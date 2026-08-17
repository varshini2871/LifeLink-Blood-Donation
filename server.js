const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();

const PORT = 3000;


// ----------------------------------
// FIREBASE
// ----------------------------------

const serviceAccount =
    require("./serviceAccountKey.json");

admin.initializeApp({
    credential:
        admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const donors =
    db.collection("donors");

const requests =
    db.collection("emergencyRequests");


// ----------------------------------
// MIDDLEWARE
// ----------------------------------

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ----------------------------------
// CONSTANTS
// ----------------------------------

const bloodGroups = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-"
];

const availabilityValues = [
    "Available",
    "Unavailable"
];

const requestStatuses = [
    "Active",
    "Fulfilled",
    "Cancelled"
];


// ----------------------------------
// VALIDATION FUNCTIONS
// ----------------------------------

function validateDonor(data) {

    const errors = [];


    if (!data.name ||
        data.name.length < 2) {

        errors.push(
            "Name must contain at least 2 characters."
        );
    }


    if (!bloodGroups.includes(
        data.bloodGroup
    )) {

        errors.push(
            "Please select a valid blood group."
        );
    }


    if (!/^[0-9]{10}$/.test(
        data.phone
    )) {

        errors.push(
            "Phone number must contain exactly 10 digits."
        );
    }


    if (!data.location) {

        errors.push(
            "Location is required."
        );
    }


    if (!availabilityValues.includes(
        data.availability
    )) {

        errors.push(
            "Invalid availability."
        );
    }


    if (
        data.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            data.email
        )
    ) {

        errors.push(
            "Invalid email address."
        );
    }


    return errors;
}


function validateRequest(data) {

    const errors = [];


    if (!data.patientName) {

        errors.push(
            "Patient name is required."
        );
    }


    if (!data.hospital) {

        errors.push(
            "Hospital name is required."
        );
    }


    if (!bloodGroups.includes(
        data.bloodGroup
    )) {

        errors.push(
            "Please select a valid blood group."
        );
    }


    if (
        !Number.isInteger(data.quantity) ||
        data.quantity < 1 ||
        data.quantity > 20
    ) {

        errors.push(
            "Quantity must be between 1 and 20."
        );
    }


    if (!data.location) {

        errors.push(
            "Location is required."
        );
    }


    if (!data.requiredDate) {

        errors.push(
            "Required date is required."
        );
    }


    if (!data.requiredTime) {

        errors.push(
            "Required time is required."
        );
    }


    if (!data.contactName) {

        errors.push(
            "Contact name is required."
        );
    }


    if (!/^[0-9]{10}$/.test(
        data.contactPhone
    )) {

        errors.push(
            "Contact phone must contain exactly 10 digits."
        );
    }


    return errors;
}


// ----------------------------------
// DONOR API - GET ALL
// ----------------------------------

app.get(
    "/api/donors",
    async (req, res) => {

        try {

            const snapshot =
                await donors.get();


            let data =
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));


            const search =
                (req.query.search || "")
                .toLowerCase();


            const bloodGroup =
                req.query.bloodGroup || "";


            const availability =
                req.query.availability || "";


            data = data.filter(donor => {

                const searchMatch =
                    !search ||
                    donor.name
                        .toLowerCase()
                        .includes(search) ||
                    donor.location
                        .toLowerCase()
                        .includes(search);


                const bloodMatch =
                    !bloodGroup ||
                    donor.bloodGroup === bloodGroup;


                const availabilityMatch =
                    !availability ||
                    donor.availability === availability;


                return (
                    searchMatch &&
                    bloodMatch &&
                    availabilityMatch
                );

            });


            res.status(200).json({

                success: true,

                count: data.length,

                data: data

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve donors."

            });

        }

    }
);


// ----------------------------------
// DONOR API - GET ONE
// ----------------------------------

app.get(
    "/api/donors/:id",
    async (req, res) => {

        try {

            const doc =
                await donors
                    .doc(req.params.id)
                    .get();


            if (!doc.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor not found."

                });

            }


            res.json({

                success: true,

                data: {
                    id: doc.id,
                    ...doc.data()
                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve donor."

            });

        }

    }
);


// ----------------------------------
// DONOR API - CREATE
// ----------------------------------

app.post(
    "/api/donors",
    async (req, res) => {

        try {

            const data = {

                name:
                    String(req.body.name || "")
                    .trim(),

                bloodGroup:
                    String(
                        req.body.bloodGroup || ""
                    ).trim(),

                phone:
                    String(req.body.phone || "")
                    .trim(),

                email:
                    String(req.body.email || "")
                    .trim(),

                location:
                    String(
                        req.body.location || ""
                    ).trim(),

                availability:
                    String(
                        req.body.availability || ""
                    ).trim(),

                lastDonationDate:
                    String(
                        req.body.lastDonationDate || ""
                    ).trim(),

                notes:
                    String(req.body.notes || "")
                    .trim(),

                createdAt:
                    new Date().toISOString()

            };


            const errors =
                validateDonor(data);


            if (errors.length > 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid donor information.",

                    errors: errors

                });

            }


            // Prevent duplicate phone numbers

            const duplicate =
                await donors
                    .where(
                        "phone",
                        "==",
                        data.phone
                    )
                    .limit(1)
                    .get();


            if (!duplicate.empty) {

                return res.status(409).json({

                    success: false,

                    message:
                        "A donor with this phone number already exists."

                });

            }


            const document =
                await donors.add(data);


            res.status(201).json({

                success: true,

                message:
                    "Donor registered successfully.",

                data: {

                    id: document.id,

                    ...data

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to register donor."

            });

        }

    }
);


// ----------------------------------
// DONOR API - UPDATE
// ----------------------------------

app.put(
    "/api/donors/:id",
    async (req, res) => {

        try {

            const ref =
                donors.doc(req.params.id);


            const existing =
                await ref.get();


            if (!existing.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor not found."

                });

            }


            const data = {

                name:
                    String(req.body.name || "")
                    .trim(),

                bloodGroup:
                    String(
                        req.body.bloodGroup || ""
                    ).trim(),

                phone:
                    String(req.body.phone || "")
                    .trim(),

                email:
                    String(req.body.email || "")
                    .trim(),

                location:
                    String(
                        req.body.location || ""
                    ).trim(),

                availability:
                    String(
                        req.body.availability || ""
                    ).trim(),

                lastDonationDate:
                    String(
                        req.body.lastDonationDate || ""
                    ).trim(),

                notes:
                    String(req.body.notes || "")
                    .trim(),

                updatedAt:
                    new Date().toISOString()

            };


            const errors =
                validateDonor(data);


            if (errors.length > 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid donor information.",

                    errors: errors

                });

            }


            await ref.update(data);


            res.json({

                success: true,

                message:
                    "Donor information updated."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to update donor."

            });

        }

    }
);


// ----------------------------------
// DONOR API - DELETE
// ----------------------------------

app.delete(
    "/api/donors/:id",
    async (req, res) => {

        try {

            const ref =
                donors.doc(req.params.id);


            const existing =
                await ref.get();


            if (!existing.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor not found."

                });

            }


            await ref.delete();


            res.json({

                success: true,

                message:
                    "Donor deleted successfully."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to delete donor."

            });

        }

    }
);


// ----------------------------------
// REQUEST API - GET
// ----------------------------------

app.get(
    "/api/requests",
    async (req, res) => {

        try {

            const snapshot =
                await requests.get();


            let data =
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));


            const bloodGroup =
                req.query.bloodGroup || "";


            const status =
                req.query.status || "";


            data = data.filter(request => {

                return (
                    (!bloodGroup ||
                        request.bloodGroup === bloodGroup) &&

                    (!status ||
                        request.status === status)
                );

            });


            data.sort((a, b) =>
                b.createdAt.localeCompare(
                    a.createdAt
                )
            );


            res.json({

                success: true,

                count: data.length,

                data: data

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve requests."

            });

        }

    }
);


// ----------------------------------
// REQUEST API - GET ONE
// ----------------------------------

app.get(
    "/api/requests/:id",
    async (req, res) => {

        try {

            const doc =
                await requests
                    .doc(req.params.id)
                    .get();


            if (!doc.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Emergency request not found."

                });

            }


            res.json({

                success: true,

                data: {

                    id: doc.id,

                    ...doc.data()

                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to retrieve request."

            });

        }

    }
);


// ----------------------------------
// REQUEST API - CREATE
// ----------------------------------

app.post(
    "/api/requests",
    async (req, res) => {

        try {

            const data = {

                patientName:
                    String(
                        req.body.patientName || ""
                    ).trim(),

                hospital:
                    String(
                        req.body.hospital || ""
                    ).trim(),

                bloodGroup:
                    String(
                        req.body.bloodGroup || ""
                    ).trim(),

                quantity:
                    Number(req.body.quantity),

                location:
                    String(
                        req.body.location || ""
                    ).trim(),

                requiredDate:
                    String(
                        req.body.requiredDate || ""
                    ).trim(),

                requiredTime:
                    String(
                        req.body.requiredTime || ""
                    ).trim(),

                description:
                    String(
                        req.body.description || ""
                    ).trim(),

                contactName:
                    String(
                        req.body.contactName || ""
                    ).trim(),

                contactPhone:
                    String(
                        req.body.contactPhone || ""
                    ).trim(),

                status: "Active",

                createdAt:
                    new Date().toISOString()

            };


            const errors =
                validateRequest(data);


            if (errors.length > 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid emergency request.",

                    errors: errors

                });

            }


            const document =
                await requests.add(data);


            res.status(201).json({

                success: true,

                message:
                    "Emergency request created successfully.",

                data: {

                    id: document.id,

                    ...data

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Unable to create request."

            });

        }

    }
);


// ----------------------------------
// REQUEST API - UPDATE STATUS
// ----------------------------------

app.put(
    "/api/requests/:id",
    async (req, res) => {

        try {

            const ref =
                requests.doc(req.params.id);


            const existing =
                await ref.get();


            if (!existing.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Emergency request not found."

                });

            }


            const status =
                req.body.status;


            if (!requestStatuses.includes(
                status
            )) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid request status."

                });

            }


            await ref.update({

                status: status,

                updatedAt:
                    new Date().toISOString()

            });


            res.json({

                success: true,

                message:
                    "Request status updated."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to update request."

            });

        }

    }
);


// ----------------------------------
// REQUEST API - DELETE
// ----------------------------------

app.delete(
    "/api/requests/:id",
    async (req, res) => {

        try {

            const ref =
                requests.doc(req.params.id);


            const existing =
                await ref.get();


            if (!existing.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Emergency request not found."

                });

            }


            await ref.delete();


            res.json({

                success: true,

                message:
                    "Emergency request deleted."

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Unable to delete request."

            });

        }

    }
);


// ----------------------------------
// UNKNOWN API
// ----------------------------------

app.use("/api", (req, res) => {

    res.status(404).json({

        success: false,

        message:
            "API endpoint not found."

    });

});


// ----------------------------------
// START SERVER
// ----------------------------------

app.listen(PORT, () => {

    console.log(
        `LifeLink running at http://localhost:${PORT}`
    );

});