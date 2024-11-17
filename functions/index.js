// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.addStudent = functions.https.onCall(async (data, context) => {
  // Verify that the request is authenticated and the user is an admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can add students.'
    );
  }

  const {name, password, schoolId, levelId} = data;

  // Validate input
  if (!name || !password || !schoolId || !levelId) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: name, password, schoolId, or levelId.'
    );
  }

  // Generate a unique email for the student
  const sanitizedName = name.toLowerCase().replace(/\s+/g, '.');
  const uniqueSuffix = Date.now(); // Using timestamp for uniqueness
  const generatedEmail = `${sanitizedName}.${uniqueSuffix}@school.com`;

  try {
    // Create the user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: generatedEmail,
      password: password,
      displayName: name,
    });

    // Store student details in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name: name,
      email: generatedEmail,
      role: 'student',
      parentId: data.parentId, // Ensure parentId is passed
      schoolId: schoolId,
      levelId: levelId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {message: 'Student added successfully.', email: generatedEmail};
  } catch (error) {
    console.error('Error adding student:', error);
    throw new functions.https.HttpsError('internal', 'Failed to add student.');
  }
});