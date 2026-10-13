package ma.nidaldeco;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class NidalDecoApplication {

	public static void main(String[] args) {
		SpringApplication.run(NidalDecoApplication.class, args);
	}

}
