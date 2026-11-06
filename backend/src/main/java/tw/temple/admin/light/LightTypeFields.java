package tw.temple.admin.light;

public record LightTypeFields(LightCategory category, String name, String shortName, int price, boolean taisui,
                              int sortOrder, boolean active, String legacyCode) {
}
