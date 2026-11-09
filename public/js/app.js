const courseForm = document.getElementById("course-form");
if (courseForm) {
    const courseFormMessage = document.getElementById("course-form-message");

    courseForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const newCourse = getCourseFormData(courseForm);

        try {
            const result = await sendCourseRequest("/api/items", "POST", newCourse);
            if (!result.ok) throw new Error(result.message);

            window.location.assign("/");
        } catch (error) {
            showFormMessage(courseFormMessage, error.message);
        }
    });
}

function getCourseFormData(form) {
    const formData = new FormData(form);
    return {
        title: formData.get("title").trim(),
        instructor: formData.get("instructor").trim(),
        category: formData.get("category"),
        level: formData.get("level"),
        durationHours: Number(formData.get("durationHours")),
        price: Number(formData.get("price")),
        description: formData.get("description").trim(),
        image: formData.get("image") || "/img/web-development.jpg"
    };
}

async function sendCourseRequest(url, method, course) {
    const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: method === "DELETE" ? undefined : JSON.stringify(course)
    });
    if (response.status === 204) return { ok: true };

    const result = await response.json();
    if (!response.ok) {
        return { ok: false, message: result.problems?.join(". ") || result.error || "Не удалось выполнить запрос" };
    }
    return { ok: true, data: result };
}

function showFormMessage(messageElement, text) {
    messageElement.hidden = false;
    messageElement.textContent = text;
    messageElement.className = "form-message form-message--error";
}

const editDialog = document.getElementById("course-edit-dialog");
if (editDialog) {
    const editForm = document.getElementById("course-edit-form");
    const editMessage = document.getElementById("course-edit-message");
    let editingCourseId;

    document.addEventListener("click", async function (event) {
        const editButton = event.target.closest("[data-edit-course]");
        const deleteButton = event.target.closest("[data-delete-course]");

        if (editButton) {
            editingCourseId = editButton.dataset.editCourse;
            editMessage.hidden = true;
            try {
                const response = await fetch(`/api/items/${editingCourseId}`);
                const course = await response.json();
                if (!response.ok) throw new Error(course.error || "Не удалось загрузить курс");
                for (const [name, value] of Object.entries(course)) {
                    if (editForm.elements.namedItem(name)) editForm.elements.namedItem(name).value = value;
                }
                editDialog.showModal();
            } catch (error) {
                window.alert(error.message);
            }
        }

        if (deleteButton) {
            const courseId = deleteButton.dataset.deleteCourse;
            if (!window.confirm("Удалить этот курс? Это действие нельзя отменить.")) return;
            try {
                const result = await sendCourseRequest(`/api/items/${courseId}`, "DELETE");
                if (!result.ok) throw new Error(result.message);
                window.location.reload();
            } catch (error) {
                window.alert(error.message);
            }
        }
    });

    editForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        try {
            const result = await sendCourseRequest(`/api/items/${editingCourseId}`, "PUT", getCourseFormData(editForm));
            if (!result.ok) throw new Error(result.message);
            window.location.reload();
        } catch (error) {
            showFormMessage(editMessage, error.message);
        }
    });

    editDialog.querySelector("[data-close-course-dialog]").addEventListener("click", function () {
        editDialog.close();
    });
}
