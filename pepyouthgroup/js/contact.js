$(document).ready(function() {
    $('#contactForm').submit(function(e) {
        e.preventDefault();
        var formData = $(this).serialize();
        $.ajax({
            type: 'POST',
            url: 'contact.php',
            data: formData,
            success: function(response) {
                var jsonData = JSON.parse(response);
                alert(jsonData.message);
            },
            error: function() {
                alert('Error submitting the form.');
            }
        });
    });

    // Add animation classes to elements on page load
    $('.contact-details').addClass('slide-in-left');
    $('.contact-form').addClass('slide-in-right');
});
