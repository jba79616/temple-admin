package tw.temple.admin.mailing;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MailingRecipientRepository extends JpaRepository<MailingRecipient, Long> {

    @Query("select r from MailingRecipient r left join fetch r.household order by r.id")
    List<MailingRecipient> findAllOrdered();

    Optional<MailingRecipient> findByHouseholdId(Long householdId);

    boolean existsByHouseholdIsNullAndRecipientNameAndAddress(String recipientName, String address);
}
