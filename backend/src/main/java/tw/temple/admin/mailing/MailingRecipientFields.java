package tw.temple.admin.mailing;

public record MailingRecipientFields(String recipientName, String zip, String address, String note, boolean active) {

    MailingRecipientFields withAddress(String address) {
        return new MailingRecipientFields(recipientName, zip, address, note, active);
    }
}
