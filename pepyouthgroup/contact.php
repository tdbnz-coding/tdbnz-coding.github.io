<?php
// Verify Google reCAPTCHA
$secretKey = '6Lel2PQpAAAAAAOhzgOB00tEHNMtia4Vr15WZvwN';

if (isset($_POST['g-recaptcha-response'])) {
    $responseKey = $_POST['g-recaptcha-response'];
    $verifyURL = "https://www.google.com/recaptcha/api/siteverify?secret={$secretKey}&response={$responseKey}";
    $response = file_get_contents($verifyURL);
    $responseData = json_decode($response);

    if ($responseData->success) {
        // Form data
        $name = $_POST['name'];
        $email = $_POST['email'];
        $phone = $_POST['phone'];
        $message = $_POST['message'];

        // Email settings
        $to = 'thomasnz@hotmail.com'; 
        $subject = "New contact form submission";
        $headers = "From: $email\r\n";
        $headers .= "Reply-To: $email\r\n";
        $headers .= "Content-type: text/html\r\n";

        // Email message
        $emailMessage = "
        <html>
        <head>
            <title>New contact form submission</title>
        </head>
        <body>
            <p><strong>Name:</strong> $name</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Phone:</strong> $phone</p>
            <p><strong>Message:</strong> $message</p>
        </body>
        </html>";

        // Send email
        mail($to, $subject, $emailMessage, $headers);
        echo "Thank you for contacting us!";
    } else {
        echo "reCAPTCHA verification failed. Please try again.";
    }
} else {
    echo "Please complete the reCAPTCHA.";
}
?>
