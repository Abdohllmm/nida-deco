package ma.nidaldeco.common;

import java.util.Arrays;
import java.util.List;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stocke une courte liste de libellés dans une colonne texte, un par ligne. */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

	@Override
	public String convertToDatabaseColumn(List<String> values) {
		List<String> cleaned = clean(values);
		return cleaned.isEmpty() ? null : String.join("\n", cleaned);
	}

	@Override
	public List<String> convertToEntityAttribute(String column) {
		return column == null || column.isBlank() ? List.of() : clean(Arrays.asList(column.split("\n")));
	}

	public static List<String> clean(List<String> values) {
		if (values == null) {
			return List.of();
		}
		return values.stream()
			.filter(v -> v != null && !v.isBlank())
			.map(v -> v.replace('\n', ' ').trim())
			.distinct()
			.toList();
	}

}
