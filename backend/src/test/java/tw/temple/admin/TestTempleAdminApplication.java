package tw.temple.admin;

import org.springframework.boot.SpringApplication;

public class TestTempleAdminApplication {

	public static void main(String[] args) {
		SpringApplication.from(TempleAdminApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
