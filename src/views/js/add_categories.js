// Script to add categories to existing exams in Firebase
// Run this in browser console or as a separate script

const firebaseConfig = {
    apiKey: "AIzaSyDsrWLvy8p_qnhimoOfPTvgnj6Ur_R2tW8",
    authDomain: "placement-test-e5aa2.firebaseapp.com",
    databaseURL: "https://placement-test-e5aa2-default-rtdb.firebaseio.com",
    projectId: "placement-test-e5aa2",
    storageBucket: "placement-test-e5aa2.firebasestorage.app",
    messagingSenderId: "379756680939",
    appId: "1:379756680939:web:593c7e1ff765fc951e10ae",
    measurementId: "G-ZL84L8KYS5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const examsRef = database.ref('exams');

// Define categories for exams (update as needed)
const examCategories = {
    // 'examKey': 'categoryName'
    // Add your exam keys and categories here
};

examsRef.once('value', (snapshot) => {
    const exams = snapshot.val();
    if (!exams) {
        console.log('No exams found');
        return;
    }

    Object.keys(exams).forEach(key => {
        const exam = exams[key];
        if (!exam.category) {
            // Assign a default category or use the defined one
            const category = examCategories[key] || 'General';
            examsRef.child(key).update({ category: category })
                .then(() => console.log(`Added category '${category}' to exam '${exam.title}'`))
                .catch(error => console.error('Error updating exam:', error));
        }
    });
});
