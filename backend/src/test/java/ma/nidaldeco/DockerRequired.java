package ma.nidaldeco;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

/**
 * Les tests d'intégration démarrent un PostgreSQL jetable avec Testcontainers.
 * Sans Docker (par exemple pendant la construction de l'image Docker du projet),
 * ils sont signalés comme ignorés au lieu d'échouer ; les tests unitaires, eux,
 * s'exécutent toujours.
 */
public class DockerRequired implements ExecutionCondition {

	private static Boolean available;

	@Override
	public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
		return dockerAvailable() ? ConditionEvaluationResult.enabled("Docker disponible")
				: ConditionEvaluationResult.disabled("Docker indisponible : test d'intégration ignoré");
	}

	private static synchronized boolean dockerAvailable() {
		if (available == null) {
			try {
				available = DockerClientFactory.instance().isDockerAvailable();
			}
			catch (RuntimeException ex) {
				available = false;
			}
		}
		return available;
	}

}
