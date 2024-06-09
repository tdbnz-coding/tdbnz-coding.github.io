<?php
// Verify Google reCAPTCHA
$secretKey = '6Lel2PQpAAAAAAOhzgOB00tEHNMtia4Vr15WZvwN';
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
    $to = 'thomasnz@hotmail.com
