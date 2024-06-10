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
});
