package tw.temple.admin.legacy;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tw.temple.admin.common.ApiException;

/** 讀 mysqldump 文字檔的 INSERT 內容；bit(1) 的 _binary 值轉成 "1"/"0"，NULL 轉成 null。 */
public class MysqlDumpParser {

    public record Table(List<String> columns, List<Map<String, String>> rows) {
    }

    private static final Pattern CREATE_TABLE = Pattern.compile("CREATE TABLE `([^`]+)` \\((.*?)\\n\\)", Pattern.DOTALL);
    private static final Pattern COLUMN_DEF = Pattern.compile("^\\s*`([^`]+)`", Pattern.MULTILINE);
    private static final String INSERT = "INSERT INTO `";

    private final String sql;
    private int pos;

    public MysqlDumpParser(String sql) {
        this.sql = sql;
    }

    public Map<String, Table> tables() {
        Map<String, List<String>> declared = declaredColumns();
        Map<String, Table> tables = new LinkedHashMap<>();
        pos = 0;
        while ((pos = sql.indexOf(INSERT, pos)) >= 0) {
            pos += INSERT.length();
            String name = readUntil('`');
            pos++;
            skipSpaces();
            List<String> columns = peek() == '(' ? readColumnList() : declared.get(name);
            if (columns == null) {
                throw ApiException.badRequest("找不到資料表 " + name + " 的欄位定義");
            }
            skipSpaces();
            expectWord("VALUES");
            Table table = tables.computeIfAbsent(name, k -> new Table(columns, new ArrayList<>()));
            readTuples(table);
        }
        return tables;
    }

    private Map<String, List<String>> declaredColumns() {
        Map<String, List<String>> result = new LinkedHashMap<>();
        Matcher m = CREATE_TABLE.matcher(sql);
        while (m.find()) {
            List<String> columns = new ArrayList<>();
            Matcher c = COLUMN_DEF.matcher(m.group(2));
            while (c.find()) {
                columns.add(c.group(1));
            }
            result.put(m.group(1), columns);
        }
        return result;
    }

    private void readTuples(Table table) {
        while (true) {
            skipSpaces();
            expect('(');
            List<String> values = new ArrayList<>(table.columns().size());
            while (true) {
                skipSpaces();
                values.add(readValue());
                skipSpaces();
                if (peek() == ',') {
                    pos++;
                    continue;
                }
                expect(')');
                break;
            }
            if (values.size() != table.columns().size()) {
                throw ApiException.badRequest("資料列欄位數 " + values.size() + " 與欄位定義 " + table.columns().size() + " 不符");
            }
            Map<String, String> row = new LinkedHashMap<>();
            for (int i = 0; i < values.size(); i++) {
                row.put(table.columns().get(i), values.get(i));
            }
            table.rows().add(row);
            skipSpaces();
            if (peek() == ',') {
                pos++;
                continue;
            }
            expect(';');
            return;
        }
    }

    private String readValue() {
        if (sql.startsWith("NULL", pos)) {
            pos += 4;
            return null;
        }
        if (sql.startsWith("_binary ", pos)) {
            pos += 8;
            skipSpaces();
            String bits = readQuoted();
            return bits.chars().anyMatch(ch -> ch != 0) ? "1" : "0";
        }
        if (peek() == '\'') {
            return readQuoted();
        }
        int start = pos;
        while (pos < sql.length() && sql.charAt(pos) != ',' && sql.charAt(pos) != ')') {
            pos++;
        }
        String literal = sql.substring(start, pos).trim();
        return literal.length() > 2 && literal.regionMatches(true, 0, "0x", 0, 2) ? hexToDecimal(literal) : literal;
    }

    private String hexToDecimal(String literal) {
        try {
            return new BigInteger(literal.substring(2), 16).toString();
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("無法解析的值：" + literal);
        }
    }

    private String readQuoted() {
        expect('\'');
        StringBuilder out = new StringBuilder();
        while (true) {
            if (pos >= sql.length()) {
                throw ApiException.badRequest("字串沒有結尾引號");
            }
            char ch = sql.charAt(pos++);
            if (ch == '\\') {
                if (pos >= sql.length()) {
                    throw ApiException.badRequest("字串沒有結尾引號");
                }
                char esc = sql.charAt(pos++);
                out.append(switch (esc) {
                    case 'n' -> '\n';
                    case 'r' -> '\r';
                    case 't' -> '\t';
                    case '0' -> '\0';
                    case 'Z' -> '\u001a';
                    case 'b' -> '\b';
                    default -> esc;
                });
            } else if (ch == '\'') {
                if (peek() == '\'') {
                    out.append('\'');
                    pos++;
                } else {
                    return out.toString();
                }
            } else {
                out.append(ch);
            }
        }
    }

    private List<String> readColumnList() {
        expect('(');
        List<String> columns = new ArrayList<>();
        while (true) {
            skipSpaces();
            expect('`');
            columns.add(readUntil('`'));
            pos++;
            skipSpaces();
            if (peek() == ',') {
                pos++;
                continue;
            }
            expect(')');
            return columns;
        }
    }

    private String readUntil(char stop) {
        int end = sql.indexOf(stop, pos);
        if (end < 0) {
            throw ApiException.badRequest("SQL 格式不完整");
        }
        String s = sql.substring(pos, end);
        pos = end;
        return s;
    }

    private void expectWord(String word) {
        if (!sql.startsWith(word, pos)) {
            throw ApiException.badRequest("第 " + pos + " 字處應為 " + word);
        }
        pos += word.length();
    }

    private void expect(char ch) {
        if (peek() != ch) {
            throw ApiException.badRequest("第 " + pos + " 字處應為 " + ch);
        }
        pos++;
    }

    private char peek() {
        return pos < sql.length() ? sql.charAt(pos) : '\0';
    }

    private void skipSpaces() {
        while (pos < sql.length() && Character.isWhitespace(sql.charAt(pos))) {
            pos++;
        }
    }
}
