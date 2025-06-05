// Data storage (using localStorage for persistence between separate apps)
function getLocalStorageData(key, defaultValue) {
    const data = localStorage.getItem(key);
    try {
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return defaultValue;
    }
}

function setLocalStorageData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Data arrays - initialized from localStorage
let students = getLocalStorageData('students', []);
let classes = new Set(students.map(s => s.class)); // Derived from students
let homeworks = getLocalStorageData('homeworks', []);
let attendanceRecords = getLocalStorageData('attendanceRecords', []);
let studentNotifications = getLocalStorageData('studentNotifications', {}); // { studentId: [{...notification, isRead: true/false}]}

// Login state
let isLoggedIn = getLocalStorageData('teacher_isLoggedIn', false);

// DOM elements (Login Page)
const loginPage = document.getElementById('login-page');
const loginUsernameInput = document.getElementById('username');
const loginPasswordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');
const newRegistrationButton = document.getElementById('new-registration-button');
const forgotPasswordButton = document.getElementById('forgot-password-button');

// DOM elements (App Content)
const appContent = document.getElementById('app-content');
const logoutButton = document.getElementById('logout-button');
const teacherClassSelect = document.getElementById('teacher-class-select');
const attendanceList = document.getElementById('attendance-list');
const saveAttendanceButton = document.getElementById('save-attendance-button');
const homeworkClassSelect = document.getElementById('homework-class-select');
const homeworkDescriptionInput = document.getElementById('homework-description');
const assignHomeworkButton = document.getElementById('assign-homework-button');
const teacherEventsList = document.getElementById('teacher-events-list'); // Static content currently


/**
 * Initializes the application.
 */
function initializeApp() {
    // Check login status on app load
    checkLoginStatus();

    // Add event listeners for login/logout
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    // Add event listeners for new registration and forgot password
    newRegistrationButton.addEventListener('click', handleNewRegistration);
    forgotPasswordButton.addEventListener('click', handleForgotPassword);

    // App-specific initialization (only runs if logged in)
    if (isLoggedIn) {
        initializeAppContent();
    }
}

/**
 * Checks the current login status and displays the appropriate UI.
 */
function checkLoginStatus() {
    if (isLoggedIn) {
        loginPage.style.display = 'none';
        appContent.style.display = 'flex'; // Use flex for app-content to maintain layout
    } else {
        loginPage.style.display = 'flex';
        appContent.style.display = 'none';
    }
}

/**
 * Handles the login attempt.
 */
function handleLogin() {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    // Hardcoded credentials for demo
    if (username === 'teacher' && password === 'teacher123') {
        isLoggedIn = true;
        setLocalStorageData('teacher_isLoggedIn', true);
        loginMessage.classList.add('hidden'); // Hide any previous error message
        checkLoginStatus(); // Switch to app content
        initializeAppContent(); // Initialize app content elements
        alertUser('Logged in successfully!');
    } else {
        loginMessage.textContent = 'Invalid username or password.';
        loginMessage.classList.remove('hidden');
        isLoggedIn = false;
        setLocalStorageData('teacher_isLoggedIn', false);
    }
}

/**
 * Handles the logout action.
 */
function handleLogout() {
    isLoggedIn = false;
    setLocalStorageData('teacher_isLoggedIn', false);
    alertUser('Logged out successfully!');
    checkLoginStatus(); // Switch back to login page
    // Clear inputs on logout
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
}

/**
 * Handles the New Registration button click. (Demo placeholder)
 */
function handleNewRegistration() {
    alertUser('New Registration: In a real application, this would redirect to a registration form where new teacher accounts could be created. For this demo, please use username "teacher" and password "teacher123".');
}

/**
 * Handles the Forgot/Reset Password button click. (Demo placeholder)
 */
function handleForgotPassword() {
    alertUser('Forgot/Reset Password: In a real application, this would initiate a password reset process (e.g., sending an email with a reset link). For this demo, please use username "teacher" and password "teacher123".');
}

/**
 * Initializes elements and listeners specific to the app content after login.
 */
function initializeAppContent() {
    updateTeacherClassDropdowns();
    // Re-attach listeners for dynamic content
    teacherClassSelect.addEventListener('change', () => {
        const selectedClass = teacherClassSelect.value;
        attendanceList.innerHTML = '';
        if (selectedClass) {
            const studentsInClass = students.filter(student => student.class === selectedClass);
            if (studentsInClass.length > 0) {
                const today = new Date().toISOString().slice(0, 10);
                studentsInClass.forEach(student => {
                    const attendanceItem = document.createElement('div');
                    attendanceItem.classList.add('list-item', 'flex', 'items-center', 'justify-between');
                    const currentAttendance = attendanceRecords.find(rec =>
                        rec.studentId === student.id && rec.date === today
                    );
                    const defaultStatus = currentAttendance ? currentAttendance.status : 'Present';
                    attendanceItem.innerHTML = `
                        <span>${student.name}</span>
                        <div class="radio-group">
                            <label class="inline-flex items-center">
                                <input type="radio" name="attendance-${student.id}" value="Present" ${defaultStatus === 'Present' ? 'checked' : ''} class="form-radio text-blue-600 h-4 w-4">
                                <span class="ml-2 text-gray-700">Present</span>
                            </label>
                            <label class="inline-flex items-center ml-4">
                                <input type="radio" name="attendance-${student.id}" value="Absent" ${defaultStatus === 'Absent' ? 'checked' : ''} class="form-radio text-red-600 h-4 w-4">
                                <span class="ml-2 text-gray-700">Absent</span>
                            </label>
                        </div>
                    `;
                    attendanceList.appendChild(attendanceItem);
                });
                saveAttendanceButton.style.display = 'block';
            } else {
                attendanceList.innerHTML = '<p class="text-gray-500 text-center">No students in this class.</p>';
                saveAttendanceButton.style.display = 'none';
            }
        } else {
            attendanceList.innerHTML = '<p class="text-gray-500 text-center">Select a class to mark attendance.</p>';
            saveAttendanceButton.style.display = 'none';
        }
    });
    saveAttendanceButton.addEventListener('click', () => {
        const selectedClass = teacherClassSelect.value;
        if (!selectedClass) {
            alertUser("Please select a class first.");
            return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const studentAttendanceItems = attendanceList.querySelectorAll('.list-item');
        attendanceRecords = attendanceRecords.filter(rec => !(rec.class === selectedClass && rec.date === today));

        studentAttendanceItems.forEach(item => {
            const studentId = parseInt(item.querySelector('input[type="radio"]').name.split('-')[1]);
            const status = item.querySelector(`input[name="attendance-${studentId}"]:checked`).value;
            const student = students.find(s => s.id === studentId);
            if (student) {
                attendanceRecords.push({
                    studentId: studentId,
                    name: student.name,
                    class: selectedClass,
                    date: today,
                    status: status
                });
                addStudentNotification(studentId, `Your attendance for ${today} is marked as ${status}.`, 'Attendance');
            }
        });
        setLocalStorageData('attendanceRecords', attendanceRecords);
        alertUser("Attendance saved successfully!");
    });

    assignHomeworkButton.addEventListener('click', () => {
        const selectedClass = homeworkClassSelect.value;
        const homeworkDescription = homeworkDescriptionInput.value.trim();

        if (selectedClass && homeworkDescription) {
            const newHomework = {
                id: Date.now(),
                class: selectedClass,
                description: homeworkDescription,
                dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString()
            };
            homeworks.push(newHomework);
            setLocalStorageData('homeworks', homeworks);
            homeworkDescriptionInput.value = '';
            alertUser(`Homework assigned to ${selectedClass} successfully!`);
            students.filter(s => s.class === selectedClass).forEach(student => {
                addStudentNotification(student.id, `New homework for ${selectedClass}: "${homeworkDescription}" (Due: ${newHomework.dueDate})`, 'Homework');
            });
        } else {
            alertUser("Please select a class and enter homework description.");
        }
    });
}


/**
 * Populates the class selection dropdowns in the Teachers App.
 */
function updateTeacherClassDropdowns() {
    // Clear existing options
    teacherClassSelect.innerHTML = '<option value="">-- Select Class --</option>';
    homeworkClassSelect.innerHTML = '<option value="">-- Select Class --</option>';

    // Add new options from the unique classes set
    Array.from(classes).forEach(cls => { // Convert Set to Array for iteration
        const option1 = document.createElement('option');
        option1.value = cls;
        option1.textContent = cls;
        teacherClassSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = cls;
        option2.textContent = cls;
        homeworkClassSelect.appendChild(option2);
    });
}

/**
 * Adds a notification to a specific student's notification list.
 * This updates the `studentNotifications` object in localStorage.
 * @param {number} studentId - The ID of the student to notify.
 * @param {string} message - The notification message.
 * @param {string} type - The type of notification (e.g., 'Homework', 'Attendance').
 */
function addStudentNotification(studentId, message, type) {
    const notification = {
        id: Date.now(),
        message: message,
        type: type,
        timestamp: new Date().toLocaleString(),
        isRead: false
    };

    studentNotifications = getLocalStorageData('studentNotifications', {}); // Get latest from storage
    if (!studentNotifications[studentId]) {
        studentNotifications[studentId] = [];
    }
    studentNotifications[studentId].unshift(notification); // Add to the beginning
    setLocalStorageData('studentNotifications', studentNotifications); // Save to localStorage
}

/**
 * Displays a temporary message to the user instead of alert().
 * @param {string} message - The message to display.
 */
function alertUser(message) {
    const alertDiv = document.createElement('div');
    alertDiv.classList.add('alert-message');
    alertDiv.textContent = message;
    document.querySelector('.main-content').prepend(alertDiv); // Add to the top of main content
    setTimeout(() => {
        alertDiv.remove(); // Remove after 3 seconds
    }, 3000);
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Listen for changes in localStorage for real-time updates (simulated)
window.addEventListener('storage', (event) => {
    // Only update data if currently logged in
    if (isLoggedIn) {
        if (event.key === 'students') {
            students = getLocalStorageData('students', []);
            classes = new Set(students.map(s => s.class));
            updateTeacherClassDropdowns();
        }
        if (event.key === 'homeworks') {
            homeworks = getLocalStorageData('homeworks', []);
        }
        if (event.key === 'attendanceRecords') {
            attendanceRecords = getLocalStorageData('attendanceRecords', []);
        }
        if (event.key === 'studentNotifications') {
             studentNotifications = getLocalStorageData('studentNotifications', {});
        }
    }
    // Update login state if it changes externally (e.g., user clears localStorage)
    if (event.key === 'teacher_isLoggedIn') {
        isLoggedIn = getLocalStorageData('teacher_isLoggedIn', false);
        checkLoginStatus();
    }
});
