package tw.temple.admin.order;

public enum ItemAction {
    ADD, REMOVE;

    public ItemAction reversed() {
        return this == ADD ? REMOVE : ADD;
    }
}
